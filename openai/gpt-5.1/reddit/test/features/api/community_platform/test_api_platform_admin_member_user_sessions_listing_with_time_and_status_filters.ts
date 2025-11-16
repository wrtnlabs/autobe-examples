import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

export async function test_api_platform_admin_member_user_sessions_listing_with_time_and_status_filters(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain authorized context
  const joinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin-console.example.com/register",
    referrer: "https://admin-console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Prepare a random memberUserId (UUID format) as target scope
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Build a time-window filter and paging options
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - sevenDaysMs);
  const toDate = new Date(now.getTime() + sevenDaysMs);

  const createdFrom = fromDate.toISOString() as string &
    tags.Format<"date-time">;
  const createdTo = toDate.toISOString() as string & tags.Format<"date-time">;

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page,
    limit,
    created_from: createdFrom,
    created_to: createdTo,
    only_active: true,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  // 4. Call the sessions index endpoint with filters
  const pageResult =
    await api.functional.communityPlatform.platformAdmin.memberUsers.sessions.index(
      connection,
      {
        memberUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 5. Basic pagination sanity checks
  TestValidator.equals(
    "pagination limit equals requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination records is not less than data length",
    pagination.records >= data.length,
  );

  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  TestValidator.predicate(
    "pagination current is non-negative",
    pagination.current >= 0,
  );

  // 6. Validate filter semantics when data is non-empty
  if (data.length > 0) {
    // 6-1. All sessions must have created_at within [createdFrom, createdTo]
    const fromMs = fromDate.getTime();
    const toMs = toDate.getTime();

    for (const session of data) {
      const createdMs = new Date(session.created_at).getTime();

      TestValidator.predicate(
        "session created_at is within requested range",
        createdMs >= fromMs && createdMs <= toMs,
      );

      // only_active true -> expect session not to be expired (expired_at null or undefined)
      TestValidator.predicate(
        "only_active filter excludes sessions with non-null expired_at",
        session.expired_at === null || session.expired_at === undefined,
      );
    }

    // 6-2. Validate sorting by created_at desc (non-increasing)
    for (let i = 1; i < data.length; i++) {
      const prev = new Date(data[i - 1].created_at).getTime();
      const curr = new Date(data[i].created_at).getTime();

      TestValidator.predicate(
        "sessions are ordered by created_at descending",
        prev >= curr,
      );
    }

    // 6-3. All sessions belong to the same member user id (consistency within page)
    const baseMemberId = data[0].memberUser.id;
    for (const session of data) {
      TestValidator.equals(
        "all session memberUser ids in page are consistent",
        session.memberUser.id,
        baseMemberId,
      );
    }
  }
}
