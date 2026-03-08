import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_actions_filter_by_community_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: "12341234",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering with community_id only
  // Use a dummy community ID since we can't create communities via admin API
  const dummyCommunityId = typia.random<string & tags.Format<"uuid">>();
  const actionsByCommunity =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: {
          community_id: dummyCommunityId,
        } satisfies IRedditLikeModerator.IRequest,
      },
    );
  typia.assert(actionsByCommunity);
  // 3. Test filtering with date range only
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const actionsByDate =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: {
          created_at_from: twoDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IRedditLikeModerator.IRequest,
      },
    );
  typia.assert(actionsByDate);
  // 4. Test combined filtering (community + date range)
  const combinedFilter =
    await api.functional.redditLike.admin.moderation.actions.index(
      adminConnection,
      {
        body: {
          community_id: dummyCommunityId,
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: now.toISOString(),
        } satisfies IRedditLikeModerator.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 5. Verify pagination structure
  TestValidator.predicate(
    "has pagination",
    combinedFilter.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination is valid",
    combinedFilter.pagination.pages >= 0,
  );
  // 6. Verify response structure
  combinedFilter.data.forEach((action) => {
    typia.assert(action);
    TestValidator.predicate(
      "has valid action type",
      action.actionType === "ban" || action.actionType === "report",
    );
    typia.assert(action.community);
    typia.assert(action.performer);
  });
}
