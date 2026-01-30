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
export async function test_api_admin_email_verification_token_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate using email verification join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate a random token for deletion (assumed not to exist in the system)
  // Note: The system generates an email verification token upon admin join, but its value is not exposed
  // so we use a random token that represents a non-existent token for testing the 404 response
  const tokenToDelete: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Verify that deletion of a non-existent token returns 404 Not Found (as per API specification)
  await TestValidator.httpError(
    "deletion of non-existent token should return 404 Not Found",
    404,
    async () => {
      await api.functional.economicForum.admin.auth.admins.email.verifications.erase(
        adminConnection,
        { token: tokenToDelete },
      );
    },
  );
  // Step 4: Verify that subsequent deletion of the same non-existent token also returns 404
  await TestValidator.httpError(
    "second deletion of the same non-existent token should return 404 Not Found",
    404,
    async () => {
      await api.functional.economicForum.admin.auth.admins.email.verifications.erase(
        adminConnection,
        { token: tokenToDelete },
      );
    },
  );
}
