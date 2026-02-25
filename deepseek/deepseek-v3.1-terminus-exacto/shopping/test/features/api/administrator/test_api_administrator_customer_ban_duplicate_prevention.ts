import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
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
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { generate_random_ecommerce_administrator_admin_user_bans_customer_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_customer_bans_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

/**
 * Test prevention of duplicate customer ban creation attempts under same administrative user banning action.
 * Verify system detects and rejects duplicate ban requests protecting data integrity with proper error response indicating existing ban relationship already exists.
 */
export async function test_api_administrator_customer_ban_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: "test123",
    },
  });
  typia.assert(adminData);
  // 2. Administrator creates an admin user ban record
  const adminBan =
    await api.functional.ecommerce.administrator.admin_user_bans.create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          ban_reason: "Test duplicate ban prevention",
          ban_duration_days: 30,
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminBan);
  // 3. Create initial customer ban under admin ban
  const customerId = typia.random<string & typia.tags.Format<"uuid">>();
  const initialBan =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.create(
      adminConnection,
      {
        adminUserBanId: adminBan.id,
        body: {
          ecommerce_administrative_action_id: adminBan.id,
          ecommerce_customer_id: customerId,
        } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
      },
    );
  typia.assert(initialBan);
  // 4. Attempt to create duplicate customer ban - should fail
  await TestValidator.error(
    "duplicate customer ban should be rejected",
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.create(
        adminConnection,
        {
          adminUserBanId: adminBan.id,
          body: {
            ecommerce_administrative_action_id: adminBan.id,
            ecommerce_customer_id: customerId,
          } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
        },
      );
    },
  );
}
