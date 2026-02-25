import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_retrieve_nonexistent_record(
  connection: api.IConnection,
): Promise<void> {
  // Generate a non-existent UUID that doesn't match any real password reset record
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent password reset record using base connection
  // Note: This endpoint has authorization-type 'null' and does not require authentication
  await TestValidator.error(
    "retrieve non-existent password reset record",
    async () => {
      await api.functional.discussionBoard.user.users.password_resets.at(
        connection,
        {
          resetId: nonExistentResetId,
        },
      );
    },
  );
}
