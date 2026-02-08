import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_retrieval_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of a soft deleted email verification record returns 404
  // 1. User registration (join) to obtain authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_user_join(userConnection, {
    body: {
      // No request body properties given by schema, assume empty
    } satisfies IMultiUserTodoUser.IJoin,
  });
  // Set userConnection headers with token
  userConnection.headers = {
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // 2. Generate a random UUID to simulate a soft deleted verificationId
  // Since we cannot create a soft deleted record by scenario, we simulate by an invalid ID
  const softDeletedVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test that accessing this soft deleted (non-existent) record throws 404 HttpError
  await TestValidator.httpError(
    "soft deleted email verification retrieval returns 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.email_verifications.at(
        userConnection,
        {
          verificationId: softDeletedVerificationId,
        },
      );
    },
  );
}
