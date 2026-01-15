import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_registration_complete_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid admin registration data
  const adminEmail = RandomGenerator.alphaNumeric(8) + "@wrtn.io";
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`;
  const adminReferrer = `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`;
  // Execute admin registration using utility function
  const result: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: adminHref,
        referrer: adminReferrer,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Validate response structure according to IShoppingMallAdmin.IAuthorized schema
  typia.assert(result);
  // Verify required fields are present and correct
  TestValidator.equals("admin has valid email", result.email, adminEmail);
  TestValidator.equals(
    "admin status is pending_email_verification",
    result.status,
    "pending_email_verification",
  );
  TestValidator.predicate("admin has role", typeof result.role === "string");
  TestValidator.predicate(
    "admin has permissions array",
    Array.isArray(result.permissions),
  );
  // Validate token structure
  TestValidator.equals(
    "token access exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token refresh exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token expired_at has valid format",
    result.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "token refreshable_until has valid format",
    result.token.refreshable_until.length > 0,
    true,
  );
}
