import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_vote_stats_with_soft_deleted_votes(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving vote statistics for a comment with soft deleted votes
  // 1. Setup admin actor and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Setup user actor and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: typia.random<ICommunityPlatformUser.IJoin>(),
  });
  typia.assert(userAuth);
  // 3. Create a comment owned by user
  await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {},
    },
  );
  // 4. Generate valid UUID commentId for vote stats call
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve vote stats as admin with random commentId
  const voteStats =
    await api.functional.communityPlatform.admin.comments.vote_stats.voteStats(
      adminConnection,
      {
        commentId,
      },
    );
  typia.assert(voteStats);
  // 6. Validate vote counts meet expectations
  TestValidator.predicate(
    "voteStats is object",
    typeof voteStats === "object" && voteStats !== null,
  );
  // 7. Authorization is enforced - unauthorized request should error
  await TestValidator.error(
    "should reject unauthorized vote stats request",
    async () => {
      const anonConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.admin.comments.vote_stats.voteStats(
        anonConnection,
        {
          commentId,
        },
      );
    },
  );
}
