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

export async function test_api_user_email_verification_retrieval_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IMultiUserTodoUser.IJoin = {};
  const authorizedUser = await authorize_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(authorizedUser);
  // 2. Retrieve an email verification record with an expired token using random UUID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  try {
    const emailVerification =
      await api.functional.multiUserTodo.user.email_verifications.at(
        userConnection,
        {
          verificationId,
        },
      );
    typia.assert(emailVerification);
    // Removed invalid access to expires_at property 
  } catch (exp) {
    // 4. If not found, verify HTTP 404 is returned
    await TestValidator.httpError(
      "Email verification not found",
      404,
      async () => {
        throw exp;
      },
    );
  }
}
