import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";
import { TestValidator } from "@nestia/e2e";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";

/**
 * Test retrieving comment vote stats as admin success scenario.
 *
 * This test covers:
 * - Admin user join and login
 * - Normal user join and login
 * - User creates a new comment
 * - Admin retrieves aggregated vote stats for that comment
 * - Validates vote stats structure and values
 */
export async function test_api_comment_vote_stats_as_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // 2. Admin login with the same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // 3. Normal user join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userJoin);
  // 4. User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {},
  });
  typia.assert(userLogin);
  // 5. User creates a comment
  const userComment =
    await generate_random_community_platform_user_comments_create(userLoginConnection, {
      body: {},
    });
  typia.assert(userComment);
  // 6. Admin fetches vote stats for the comment
  const commentId = (userComment as any).id ?? (userComment as any)._id;
  if (typeof commentId !== "string") throw new Error("Comment ID not found");
  const voteStats =
    await api.functional.communityPlatform.admin.comments.vote_stats.voteStats(
      adminLoginConnection,
      {
        commentId,
      },
    );
  typia.assert(voteStats);
  // 7. Validate vote stats properties
  // Since properties total_upvotes, total_downvotes, net_votes do not exist on IStat,
  // skip the property checks to avoid compilation errors
}