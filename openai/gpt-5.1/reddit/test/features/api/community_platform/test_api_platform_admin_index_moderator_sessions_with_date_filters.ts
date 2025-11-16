import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorSession";

export async function test_api_platform_admin_index_moderator_sessions_with_date_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as platform admin via join
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/platform/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Call sessions.index once to get a baseline page for some moderator.
  const initialModeratorId: string = typia.random<string>();

  const initialPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId: initialModeratorId,
        body: {},
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModeratorSession.ISummary>(
    initialPage,
  );

  const initialData = initialPage.data;
  const initialPagination = initialPage.pagination;

  // Basic pagination sanity: records should be >= current page data length.
  TestValidator.predicate(
    "initial page pagination.records is not less than data.length",
    initialPagination.records >= initialData.length,
  );

  if (initialPagination.records === 0) {
    // When there are no records at all, pages must be 0 and there's nothing
    // meaningful to test regarding from/to filters. Still validate invariants.
    TestValidator.equals(
      "when records is 0, pages must be 0",
      initialPagination.pages,
      0,
    );
    return;
  }

  if (initialData.length === 0) {
    // Defensive: records > 0 but this page happened to be empty. Just ensure
    // page/limit invariants hold and exit.
    TestValidator.predicate(
      "initial pages should be consistent with records and limit when data is empty",
      initialPagination.pages === 0 ||
        initialPagination.records <=
          initialPagination.pages * initialPagination.limit,
    );
    return;
  }

  // 3. Sort sessions by created_at to derive time windows
  const sortedByCreatedAt = [...initialData].sort((a, b) => {
    const lhs = new Date(a.created_at).getTime();
    const rhs = new Date(b.created_at).getTime();
    return lhs - rhs;
  });

  const minSession = sortedByCreatedAt[0];
  const maxSession = sortedByCreatedAt[sortedByCreatedAt.length - 1];
  const totalRecords = initialPagination.records;

  // Derive a narrow window that is properly contained within the observed
  // [min, max] whenever possible.
  let narrowFrom: string & tags.Format<"date-time">;
  let narrowTo: string & tags.Format<"date-time">;

  if (sortedByCreatedAt.length >= 3) {
    // Use inner bounds to ensure a true subset window when possible.
    narrowFrom = sortedByCreatedAt[1].created_at;
    narrowTo = sortedByCreatedAt[sortedByCreatedAt.length - 2].created_at;
  } else if (sortedByCreatedAt.length === 2) {
    // Two elements: use first as from, and synthesize a to just after the
    // last element to create a non-degenerate interval.
    const fromIso = sortedByCreatedAt[0].created_at;
    const lastTime = new Date(sortedByCreatedAt[1].created_at).getTime();
    const narrowToIso = typia.assert<string & tags.Format<"date-time">>(
      new Date(lastTime + 1).toISOString(),
    );
    narrowFrom = fromIso;
    narrowTo = narrowToIso;
  } else {
    // Single element: create a tiny window starting at that element and
    // extending 1ms beyond it.
    const onlyTime = new Date(minSession.created_at).getTime();
    narrowFrom = minSession.created_at;
    narrowTo = typia.assert<string & tags.Format<"date-time">>(
      new Date(onlyTime + 1).toISOString(),
    );
  }

  const fromTime = new Date(narrowFrom).getTime();
  const toTime = new Date(narrowTo).getTime();

  // Ensure we have a meaningful interval; if not, skip range-based checks.
  if (fromTime >= toTime) {
    TestValidator.predicate(
      "narrow interval is non-negative width (from <= to)",
      fromTime <= toTime,
    );
    return;
  }

  const limitForFilter: number & tags.Type<"int32"> = initialPagination.limit;

  const narrowRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: limitForFilter,
    from: narrowFrom,
    to: narrowTo,
  } satisfies ICommunityPlatformCommunityModeratorSession.IRequest;

  const narrowPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId: initialModeratorId,
        body: narrowRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModeratorSession.ISummary>(
    narrowPage,
  );

  const narrowData = narrowPage.data;
  const narrowPagination = narrowPage.pagination;

  // 4. Assert every session in the narrow page respects [from, to) window.
  await ArrayUtil.asyncForEach(narrowData, async (session) => {
    const createdTime = new Date(session.created_at).getTime();
    TestValidator.predicate(
      "session.created_at must be >= from",
      createdTime >= fromTime,
    );
    TestValidator.predicate(
      "session.created_at must be < to",
      createdTime < toTime,
    );
  });

  // 5. Pagination invariants on the narrow page.
  TestValidator.predicate(
    "narrow page pagination.records is not less than data.length",
    narrowPagination.records >= narrowData.length,
  );

  TestValidator.predicate(
    "narrow page records must be <= totalRecords from initial page",
    narrowPagination.records <= totalRecords,
  );

  // 6. Call again with a broader range that should include at least as many
  // sessions as the narrow range. Use the full observed [min, max] window
  // extended slightly on the upper bound to ensure it is a true superset.
  const minTime = new Date(minSession.created_at).getTime();
  const maxTime = new Date(maxSession.created_at).getTime();

  const broadFrom = minSession.created_at;
  const broadTo = typia.assert<string & tags.Format<"date-time">>(
    new Date(maxTime + 1).toISOString(),
  );

  const broadRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: limitForFilter,
    from: broadFrom,
    to: broadTo,
  } satisfies ICommunityPlatformCommunityModeratorSession.IRequest;

  const broadPage =
    await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
      connection,
      {
        communityModeratorId: initialModeratorId,
        body: broadRequestBody,
      },
    );
  typia.assert<IPageICommunityPlatformCommunityModeratorSession.ISummary>(
    broadPage,
  );

  const broadPagination = broadPage.pagination;

  TestValidator.predicate(
    "broad range records must be >= narrow range records",
    broadPagination.records >= narrowPagination.records,
  );

  // Basic page/limit relationship checks across responses
  TestValidator.predicate(
    "initial pages should be consistent with records and limit",
    initialPagination.pages === 0 ||
      initialPagination.records <=
        initialPagination.pages * initialPagination.limit,
  );

  TestValidator.predicate(
    "narrow pages should be consistent with records and limit",
    narrowPagination.pages === 0 ||
      narrowPagination.records <=
        narrowPagination.pages * narrowPagination.limit,
  );

  TestValidator.predicate(
    "broad pages should be consistent with records and limit",
    broadPagination.pages === 0 ||
      broadPagination.records <= broadPagination.pages * broadPagination.limit,
  );
}
