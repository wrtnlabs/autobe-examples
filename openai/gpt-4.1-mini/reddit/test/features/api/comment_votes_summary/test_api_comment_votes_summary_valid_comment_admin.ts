import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_votes_summary_valid_comment_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Prepare a valid UUID for commentId (simulate random UUID)
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // 3. Retrieve votes summary for the valid commentId
  const votesSummary =
    await api.functional.communityPlatform.admin.comments.votes.summary.votesSummary(
      adminConnection,
      { commentId },
    );
  // 4. Validate the response type
  typia.assert(votesSummary);
  // 5. Validate that upvoteCount and downvoteCount are integers (int32)
  TestValidator.predicate(
    "upvoteCount is int32",
    Number.isInteger(votesSummary.upvoteCount),
  );
  TestValidator.predicate(
    "downvoteCount is int32",
    Number.isInteger(votesSummary.downvoteCount),
  );
  // Additional business logic valiation can be added if necessary
}
