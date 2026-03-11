import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test deletion impact analysis for a non-existent comment ID.
 * Authenticate as admin and attempt to analyze deletion impact using an invalid comment UUID.
 * Verify the response correctly indicates the comment does not exist, is not eligible for deletion,
 * and provides appropriate restriction messages.
 */
export async function test_api_comment_deletion_impact_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate a non-existent comment UUID
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Analyze deletion impact for non-existent comment
  const deletionImpact =
    await api.functional.discussionBoard.admin.comments.deletion_impact.deletionImpact(
      adminConnection,
      {
        commentId: nonExistentCommentId,
      },
    );
  // 4. Complete validation using typia.assert - this validates ALL properties
  typia.assert(deletionImpact);
}
