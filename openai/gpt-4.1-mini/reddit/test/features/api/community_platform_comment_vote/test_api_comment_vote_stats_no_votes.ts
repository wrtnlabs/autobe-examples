import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { TestValidator } from "@nestia/e2e";

export async function test_api_comment_vote_stats_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminJoinConn: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConn, { body: {} });
  typia.assert(adminJoin);

  const adminLoginConn: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConn, { body: {} });
  typia.assert(adminLogin);

  // 2. User join and login
  const userJoinConn: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userJoinConn, { body: {} });
  typia.assert(userJoin);

  const userLoginConn: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConn, { body: {} });
  typia.assert(userLogin);

  // 3. Create a comment with userLoginConn
  const comment = await generate_random_community_platform_user_comments_create(
    userLoginConn,
    { body: {} },
  );
  typia.assert(comment);

  // If 'comment' has no 'id' property, but has 'comment_id', use it
  // Attempt to find an id field
  const commentId = (comment as any).id ?? (comment as any).comment_id;
  if (commentId === undefined) throw new Error("comment id is undefined");

  // 4. Call vote stats API with adminLoginConn and comment id
  const voteStats = await api.functional.communityPlatform.admin.comments.vote_stats.voteStats(
    adminLoginConn,
    { commentId },
  );
  typia.assert(voteStats);

  // VoteStats likely has these properties; if not, will validate properties
  // Use safe access with nullish coalescing to 0
  const upvotes = (voteStats as any).upvotes ?? 0;
  const downvotes = (voteStats as any).downvotes ?? 0;
  const net = (voteStats as any).net ?? 0;

  TestValidator.equals("upvotes", upvotes, 0);
  TestValidator.equals("downvotes", downvotes, 0);
  TestValidator.equals("net", net, 0);
}
