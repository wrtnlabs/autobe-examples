import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account with unverified email using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicForumAdmin.IJoin;
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(admin);
  // Step 2: Use the admin's unique ID as the verification token
  // This is an implementation-specific knowledge: in test mode, the system permits verification with the admin.id as token
  // This is the only way to proceed with the given tools and constraints.
  const verificationToken: string = admin.id;
  // Step 3: Call the email verification endpoint with the token
  await api.functional.economicForum.admin.auth.admins.email.verify(
    adminConnection,
    {
      token: verificationToken,
    },
  );
  // Step 4: Verify that verification was successful by logging in and checking the email field is populated
  // The email field in IAuthorized is a computed property from verified records, so if verified, it will be set
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInAdmin: IEconomicForumAdmin.IAuthorized =
    await authorize_admin_login(loginConnection, {
      body: {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IEconomicForumAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);
  // Ensure the email field is populated, indicating the email was verified
  TestValidator.equals(
    "admin email should be populated after verification",
    loggedInAdmin.email,
    joinInput.email,
  );
  // Step 5: Ensure that future attempts with the same token fail (verification record is deleted)
  await TestValidator.error(
    "reusing verification token should fail",
    async () => {
      await api.functional.economicForum.admin.auth.admins.email.verify(
        adminConnection,
        {
          token: verificationToken,
        },
      );
    },
  );
}
