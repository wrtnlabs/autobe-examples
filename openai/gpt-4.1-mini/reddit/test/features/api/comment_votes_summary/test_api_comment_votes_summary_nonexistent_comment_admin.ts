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

export async function test_api_comment_votes_summary_nonexistent_comment_admin(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving vote summary for a non-existing commentId with admin authentication
  // 1. Admin join and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Generate a random UUID for non-existent commentId
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the votesSummary endpoint for the non-existent commentId and expect 404 error
  await TestValidator.httpError(
    "404 error for non-existing comment vote summary",
    404,
    async () => {
      await api.functional.communityPlatform.admin.comments.votes.summary.votesSummary(
        adminConnection,
        { commentId: nonExistentCommentId },
      );
    },
  );
}
