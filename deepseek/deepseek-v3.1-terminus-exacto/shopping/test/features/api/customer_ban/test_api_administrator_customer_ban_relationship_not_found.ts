import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test proper error handling when retrieving a non-existent customer ban relationship.
 * Authenticate as an administrator and attempt to retrieve a customer ban relationship
 * using invalid or non-existent IDs. Validate that the system returns appropriate 404
 * error codes when either the admin user ban ID does not exist, the customer ban ID
 * does not exist, or the relationship between the two identifiers does not match.
 */
export async function test_api_administrator_customer_ban_relationship_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin12345",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test case 1: Non-existent admin user ban ID
  await TestValidator.httpError(
    "should return 404 for non-existent admin user ban ID",
    404,
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.at(
        adminConnection,
        {
          adminUserBanId: typia.random<string & tags.Format<"uuid">>(),
          customerBanId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 2: Non-existent customer ban ID
  await TestValidator.httpError(
    "should return 404 for non-existent customer ban ID",
    404,
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.at(
        adminConnection,
        {
          adminUserBanId: typia.random<string & tags.Format<"uuid">>(),
          customerBanId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test case 3: Mismatched relationship (mix of valid-looking but unrelated IDs)
  await TestValidator.httpError(
    "should return 404 for mismatched relationship between IDs",
    404,
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.at(
        adminConnection,
        {
          adminUserBanId: typia.random<string & tags.Format<"uuid">>(),
          customerBanId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
