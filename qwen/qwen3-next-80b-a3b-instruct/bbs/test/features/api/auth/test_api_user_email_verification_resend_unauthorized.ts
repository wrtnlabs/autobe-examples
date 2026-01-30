import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_email_verification_resend_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an unauthenticated connection (base connection without any authorization)
  const unauthConnection: api.IConnection = { host: connection.host };
  // Step 2: Call resend endpoint with unauthenticated connection - should fail with 401 Unauthorized
  await TestValidator.error(
    "unauthenticated user cannot resend verification email",
    async () => {
      await api.functional.economicForum.user.auth.users.email.verify.resend.sendVerification(
        unauthConnection,
      );
    },
  );
}
