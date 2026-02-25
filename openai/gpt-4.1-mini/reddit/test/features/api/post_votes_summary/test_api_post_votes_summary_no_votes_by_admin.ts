import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_votes_summary_no_votes_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Retrieve admin authorization by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
      displayName: "AdminUser",
      bio: null,
      avatarUrl: null,
    },
  });
  // After join, adminConnection.headers are updated internally
  // Prepare a postId (UUID) to test a post with no votes
  const noVotePostId = typia.random<string & tags.Format<"uuid">>();
  // Call the vote summary API
  const summary =
    await api.functional.communityPlatform.admin.posts.votes.summary.getVotesSummary(
      adminConnection,
      { postId: noVotePostId },
    );
  // Validate the response structure
  typia.assert(summary);
  // Validate that the counts are zero for no votes
  TestValidator.equals(
    "upvotes should be zero for no votes",
    summary.upvotes,
    0,
  );
  TestValidator.equals(
    "downvotes should be zero for no votes",
    summary.downvotes,
    0,
  );
}
