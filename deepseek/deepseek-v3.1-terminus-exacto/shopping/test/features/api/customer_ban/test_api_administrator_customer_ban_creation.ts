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

export async function test_api_administrator_customer_ban_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // Step 2: Create administrative user ban record
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "customer",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          appeal_status: "none",
          appeal_reason: null,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Step 3: Create customer ban relationship
  const customerBan =
    await generate_random_ecommerce_administrator_admin_user_bans_customer_bans_create(
      adminConnection,
      {
        params: {
          adminUserBanId: adminUserBan.id,
        },
        body: {
          ecommerce_administrative_action_id: adminUserBan.id,
          ecommerce_customer_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
      },
    );
  typia.assert(customerBan);
  // Step 4: Validate business logic (not type validation)
  TestValidator.equals(
    "administrative action id should match",
    customerBan.administrativeAction.id,
    adminUserBan.id,
  );
  // Step 5: Test duplicate prevention - should error on duplicate creation
  await TestValidator.error(
    "should prevent duplicate customer ban",
    async () => {
      await generate_random_ecommerce_administrator_admin_user_bans_customer_bans_create(
        adminConnection,
        {
          params: {
            adminUserBanId: adminUserBan.id,
          },
          body: {
            ecommerce_administrative_action_id: adminUserBan.id,
            ecommerce_customer_id: customerBan.customer.id,
          } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
        },
      );
    },
  );
}
