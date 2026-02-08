import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
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
import { generate_random_community_platform_admin_comments_votes_update_vote } from "../../../generate/generate_random_community_platform_admin_comments_votes_update_vote";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote_of_users } from "../../../prepare/prepare_random_community_platform_comment_vote_of_users";

export async function test_api_admin_comment_vote_update_and_removal(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin actor and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.IJoin is empty type
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_admin_login(adminConnection, {
    body: {}, // ICommunityPlatformAdmin.ILogin is empty type
  });
  typia.assert(adminLogin);
  // Setup user actor and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {}, // ICommunityPlatformUser.IJoin is empty type
  });
  typia.assert(userJoin);
  const userLogin = await authorize_user_login(userConnection, {
    body: {}, // ICommunityPlatformUser.ILogin is empty type
  });
  typia.assert(userLogin);
  // User creates a comment
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    {
      body: {}, // Partial comment creation data, all randomized by utility
    },
  );
  typia.assert(comment);

  // Cast 'comment' to any to safely access 'id' as it does not exist on ICommunityPlatformComment
  const commentId = (comment as any).id ?? (comment as any).comment_id;
  if (commentId === undefined) throw new Error("Comment ID is undefined.");

  // Scenario 1: Admin upvotes then downvotes the comment
  // Admin upvote
  const upvote =
    await generate_random_community_platform_admin_comments_votes_update_vote(
      adminConnection,
      {
        params: { commentId: commentId },
        body: {
          comment_id: commentId,
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(upvote);

  // Cast 'upvote' to any to access vote_type since ICommunityPlatformCommentVoteOfUsers does not declare vote_type
  const upvote_type = (upvote as any).vote_type;
  TestValidator.equals("admin vote is upvote", upvote_type, "upvote");

  // Admin changes vote to downvote (update)
  const downvote =
    await generate_random_community_platform_admin_comments_votes_update_vote(
      adminConnection,
      {
        params: { commentId: commentId },
        body: {
          comment_id: commentId,
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(downvote);

  // Cast 'downvote' to any to access vote_type
  const downvote_type = (downvote as any).vote_type;
  TestValidator.equals(
    "admin vote updated to downvote",
    downvote_type,
    "downvote",
  );

  // Scenario 2: Admin removes vote on comment
  const removal =
    await generate_random_community_platform_admin_comments_votes_update_vote(
      adminConnection,
      {
        params: { commentId: commentId },
        body: {
          comment_id: commentId,
          vote_type: null,
        } satisfies ICommunityPlatformCommentVoteOfUsers.ICreate,
      },
    );
  typia.assert(removal);

  // Cast 'removal' to any to access vote_type
  const removal_type = (removal as any).vote_type;
  TestValidator.equals("admin vote removed", removal_type, null);
}
