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

export async function test_api_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for the user account
  const userConnection: api.IConnection = { host: connection.host };
  // Step 2: Register user and perform email verification
  const user = await api.functional.communityPlatform.auth.user.join(
    userConnection,
    {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "Password123!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPlatformUser.IJoin,
    },
  );
  typia.assert(user);
  // Step 3: Retrieve the verification record
  const verification =
    await api.functional.communityPlatform.user.email_verifications.at(
      userConnection,
      {
        verificationId: user.id,
      },
    );
  typia.assert(verification);
}
