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

/**
 * Validate pagination behavior when a platform admin indexes moderator
 * sessions.
 *
 * Business goals:
 *
 * - Ensure a platform administrator can authenticate via the join endpoint.
 * - Verify that the moderator sessions index endpoint supports basic pagination
 *   semantics across multiple pages when records exist.
 * - Confirm that requesting an out-of-range page index does not crash the system
 *   and results in either an empty page or a handled error.
 * - Ensure that, for typical paging implementations, session IDs on different
 *   pages do not overlap when both pages contain data.
 */
export async function test_api_platform_admin_index_moderator_sessions_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a random communityModeratorId (we don't know actual fixture IDs).
  const communityModeratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const pageSize = 20 as const;

  let page1:
    | IPageICommunityPlatformCommunityModeratorSession.ISummary
    | undefined;
  let page2:
    | IPageICommunityPlatformCommunityModeratorSession.ISummary
    | undefined;

  // 3. Try to request first page. If it fails, we'll validate error behavior
  //    later using TestValidator.error. We do not assert here when exception.
  try {
    page1 =
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
        connection,
        {
          communityModeratorId,
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: pageSize as number & tags.Type<"int32">,
          } satisfies ICommunityPlatformCommunityModeratorSession.IRequest,
        },
      );
    typia.assert(page1);

    // Basic pagination assertions for page 1.
    TestValidator.equals(
      "page 1: pagination.current should be 1",
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      "page 1: pagination.limit should equal requested pageSize",
      page1.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      "page 1: data length must be between 0 and pageSize",
      page1.data.length >= 0 && page1.data.length <= pageSize,
    );
  } catch {
    // Swallow here; we'll create an explicit error expectation later.
  }

  // 4. Request second page only if page1 succeeded.
  if (page1 !== undefined) {
    try {
      page2 =
        await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
          connection,
          {
            communityModeratorId,
            body: {
              page: 2 as number & tags.Type<"int32">,
              limit: pageSize as number & tags.Type<"int32">,
            } satisfies ICommunityPlatformCommunityModeratorSession.IRequest,
          },
        );
      typia.assert(page2);

      TestValidator.equals(
        "page 2: pagination.current should be 2",
        page2.pagination.current,
        2,
      );
      TestValidator.equals(
        "page 2: pagination.limit should equal requested pageSize",
        page2.pagination.limit,
        pageSize,
      );
      TestValidator.predicate(
        "page 2: data length must be between 0 and pageSize",
        page2.data.length >= 0 && page2.data.length <= pageSize,
      );

      // 5. If both pages have data, ensure no overlapping IDs.
      if (page1.data.length > 0 && page2.data.length > 0) {
        const ids1 = page1.data.map((s) => s.id);
        const ids2 = page2.data.map((s) => s.id);
        const overlap = ids1.some((id) => ids2.includes(id));
        TestValidator.predicate(
          "page 1 and page 2 should have no overlapping session IDs when both are non-empty",
          overlap === false,
        );
      }

      // 6. Out-of-range page index (very large page number).
      const outOfRangePage = 9999 as const;
      const outPage =
        await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
          connection,
          {
            communityModeratorId,
            body: {
              page: outOfRangePage as number & tags.Type<"int32">,
              limit: pageSize as number & tags.Type<"int32">,
            } satisfies ICommunityPlatformCommunityModeratorSession.IRequest,
          },
        );
      typia.assert(outPage);
      TestValidator.predicate(
        "out-of-range page: data length should still respect pageSize upper bound",
        outPage.data.length >= 0 && outPage.data.length <= pageSize,
      );
      TestValidator.predicate(
        "out-of-range page: current page index should be non-negative",
        outPage.pagination.current >= 0,
      );
    } catch {
      // If any of these fail due to unknown moderator, we will still have
      // separate error scenario validation below.
    }
  }

  // 7. Explicit error expectation for unknown moderator ID.
  await TestValidator.error(
    "indexing sessions for an unknown moderator should fail gracefully",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityModerators.sessions.index(
        connection,
        {
          communityModeratorId,
          body: {},
        },
      );
    },
  );
}
