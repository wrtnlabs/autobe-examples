import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account to have an email verification entry.
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // 2. Try to access email verification token details without providing authentication.
  await TestValidator.httpError(
    "access without authentication",
    401,
    async () => {
      await api.functional.communityPlatform.user.email_verifications.at(
        connection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Try to access email verification token details with a different user context.
  const anotherUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(anotherUserConnection, { body: {} });
  // We cannot obtain a real valid emailVerificationId to test different user access because the structure of ICommunityPlatformUserEmailVerification is empty.
  // Instead, simulate unauthorized access by requesting a random but valid UUID as emailVerificationId and expect 403 or 404 error.
  await TestValidator.httpError(
    "access with different user",
    [403, 404, 401],
    async () => {
      await api.functional.communityPlatform.user.email_verifications.at(
        anotherUserConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
