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

export async function test_api_user_email_verification_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user to own the email verification
  const joinConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(joinConnection, {});
  typia.assert(user);
  // Step 2: Create a second connection without authentication (unauthorized user)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Step 3: Construct a dummy email verification update payload
  const updateBody = {
    is_verified: true,
    deleted_at: null,
  } satisfies ICommunityPlatformUserEmailVerification.IUpdate;
  // Step 4: Try to update email verification record with unauthorized connection
  // Use a random UUID for id to simulate update attempt
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized update should return 403",
    403,
    async () => {
      await api.functional.communityPlatform.user.email_verifications.updateEmailVerification(
        unauthorizedConnection,
        {
          id: randomId,
          body: updateBody,
        },
      );
    },
  );
}
