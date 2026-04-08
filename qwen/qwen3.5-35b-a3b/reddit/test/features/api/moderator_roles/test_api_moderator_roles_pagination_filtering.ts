import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModeratorRole";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderator_roles_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test pagination with default parameters
  const page1 =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      { body: { limit: 10 } satisfies IRedditCommunityModeratorRole.IRequest },
    );
  typia.assert(page1);
  // Verify pagination metadata structure and values
  TestValidator.equals("current page is positive", page1.pagination.current, 1);
  TestValidator.predicate(
    "limit within bounds",
    page1.pagination.limit > 0 && page1.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages non-negative", page1.pagination.pages >= 0);
  // 3. Test filtering by role='owner'
  const ownerRoles =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          role: "owner" as const,
          limit: 10,
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(ownerRoles);
  if (ownerRoles.data.length > 0) {
    TestValidator.predicate(
      "owner roles filtered",
      ownerRoles.data.every((role) => role.role === "owner"),
    );
  }
  // 4. Test filtering by role='moderator'
  const moderatorRoles =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          role: "moderator" as const,
          limit: 10,
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(moderatorRoles);
  if (moderatorRoles.data.length > 0) {
    TestValidator.predicate(
      "moderator roles filtered",
      moderatorRoles.data.every((role) => role.role === "moderator"),
    );
  }
  // 5. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFiltered =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          created_at_min: oneWeekAgo.toISOString(),
          created_at_max: now.toISOString(),
          limit: 10,
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(dateFiltered);
  if (dateFiltered.data.length > 0) {
    TestValidator.predicate(
      "date range filtered",
      dateFiltered.data.every(
        (role) => role.created_at >= oneWeekAgo.toISOString(),
      ),
    );
  }
  // 6. Test cursor-based pagination (if there are more than 10 records)
  if (page1.pagination.records > 10) {
    const nextPage =
      await api.functional.redditCommunity.admin.moderator_roles.index(
        adminConnection,
        {
          body: {
            limit: 10,
            cursor:
              page1.data.length > 0 ? page1.data[0].created_at : undefined,
          } satisfies IRedditCommunityModeratorRole.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.predicate(
      "next page pagination valid",
      nextPage.pagination.current === page1.pagination.current + 1,
    );
  }
  // 7. Test empty result with non-existent community_id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          reddit_community_community_id: nonExistentId,
          limit: 10,
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty pagination records",
    emptyResult.pagination.records,
    0,
  );
  // 8. Test combined filters (community_id + role)
  const combinedFiltered =
    await api.functional.redditCommunity.admin.moderator_roles.index(
      adminConnection,
      {
        body: {
          reddit_community_community_id: nonExistentId,
          role: "moderator" as const,
          limit: 10,
        } satisfies IRedditCommunityModeratorRole.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filters empty",
    combinedFiltered.data.length,
    0,
  );
}
