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
export async function test_api_admin_email_verification_resend(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate admin by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  // Step 2: Verify admin authentication was successful
  typia.assert(admin);
  // Step 3: Call the email verification resend endpoint with the authenticated connection (first issuance)
  // This endpoint takes no request body, only requires a valid authentication token in headers
  await api.functional.economicForum.admin.auth.admins.email._verify.resend.create(
    adminConnection,
  );
  // Step 4: Call the resend endpoint again to test multiple reissuance
  // The system should revoke the previous token and create a new one
  await api.functional.economicForum.admin.auth.admins.email._verify.resend.create(
    adminConnection,
  );
  // Step 5: Test error condition - call endpoint without authentication
  // Create a clean connection without authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Expect 404 Not Found error since no verification record exists for unauthenticated user
  await TestValidator.error(
    "unauthenticated admin should receive 404 error",
    async () => {
      await api.functional.economicForum.admin.auth.admins.email._verify.resend.create(
        guestConnection,
      );
    },
  );
  // Step 6: Validation: All operations succeeded without error
  // The endpoint returns void, so we validate by the absence of errors
}
