import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todoapp_send_verification_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create test user with unverified email
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(registeredUser);
  // 2. Send verification email (valid request)
  const sendVerificationResponse =
    await api.functional.todoApp.email_verifications.verifyEmail(
      userConnection,
      {
        body: {
          action: "send_verification_email" as const,
          page: null,
          limit: null,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(sendVerificationResponse);
  // 3. Verify multiple verification requests work (no spam protection)
  const secondVerification =
    await api.functional.todoApp.email_verifications.verifyEmail(
      userConnection,
      {
        body: {
          action: "send_verification_email" as const,
          page: null,
          limit: null,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(secondVerification);
  // 4. Test unauthorized access (missing token)
  const publicConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized access", 401, async () => {
    await api.functional.todoApp.email_verifications.verifyEmail(
      publicConnection,
      {
        body: {
          action: "send_verification_email" as const,
          page: null,
          limit: null,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  });
}
