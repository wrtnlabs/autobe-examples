import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_registration(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // Call the admin registration endpoint using the utility function
  const adminResult: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  // Validate the response structure with typia.assert
  typia.assert(adminResult);
  // Verify the admin account properties are correctly returned
  TestValidator.equals(
    "admin account has valid email",
    adminResult.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin account has valid status",
    adminResult.status,
    "active",
  );
  TestValidator.predicate(
    "admin account has UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminResult.id,
    ),
  );
  TestValidator.predicate(
    "admin account has valid creation timestamp",
    !isNaN(new Date(adminResult.created_at).getTime()),
  );
  TestValidator.predicate(
    "admin account has valid update timestamp",
    !isNaN(new Date(adminResult.updated_at).getTime()),
  );
  // Verify the token structure
  TestValidator.equals(
    "token has access property",
    typeof adminResult.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh property",
    typeof adminResult.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token has valid access expiration",
    !isNaN(new Date(adminResult.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "token has valid refreshable until",
    !isNaN(new Date(adminResult.token.refreshable_until).getTime()),
  );
  // Verify the token access property is not empty
  TestValidator.predicate(
    "access token is not empty",
    adminResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    adminResult.token.refresh.length > 0,
  );
}
