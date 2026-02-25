import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test administrator attempting to delete a non-existent comment to validate proper error handling.
 * Steps:
 * 1. Authenticate as administrator
 * 2. Attempt to delete a comment with a randomly generated UUID that doesn't exist in the system
 * 3. Validate that the system returns a 404 Not Found error
 * 4. Confirm proper resource identification precedes permission checking
 */
export async function test_api_admin_comment_delete_non_existent_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete the non-existent comment and validate 404 error
  await TestValidator.httpError(
    "non-existent comment deletion returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.comments.erase(
        adminConnection,
        {
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
