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

export async function test_api_user_email_verification_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of the email verification record by its UUID id with user authentication.
  // Validate unauthorized requests are denied access.
  // Confirm 404 response for non-existent id.
  // 1. User join and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(user);
  // 2. Use a random UUID for "not found" testing
  const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to fetch verification with invalid (non-existent) id, expect 404
  await TestValidator.httpError(
    "fetch non-existent email verification should 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.email_verifications.atEmailVerification(
        userConnection,
        {
          id: randomNonExistentId,
        },
      );
    },
  );
  // 4. Test unauthorized access: new connection with no auth, expect 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized fetch should be denied",
    401,
    async () => {
      await api.functional.communityPlatform.user.email_verifications.atEmailVerification(
        unauthorizedConnection,
        {
          id: randomNonExistentId,
        },
      );
    },
  );
}
