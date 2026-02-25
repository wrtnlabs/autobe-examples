import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Generate a random valid UUID that doesn't exist in the system
  const nonExistentVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Call the endpoint and expect a 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent verification ID",
    404,
    async () => {
      await api.functional.discussionBoard.user.users.email_verifications.at(
        userConnection,
        { verificationId: nonExistentVerificationId },
      );
    },
  );
}
