import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create";
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

/**
 * Test prevention of duplicate seller ban relationships.
 * 1. Authenticate as administrator
 * 2. Create an admin user ban record
 * 3. Associate a seller with the ban successfully
 * 4. Attempt to create the same seller-ban relationship again
 * 5. Verify system rejects duplicate with appropriate error message
 */
export async function test_api_admin_user_ban_duplicate_seller_association_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create parent admin user ban
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "seller",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          appeal_status: "none",
        },
      },
    );
  typia.assert(adminUserBan);
  // 3. Prepare seller-ban relationship data
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const relationshipBody = {
    intervention_type: "account_suspension",
    suspension_duration_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
    >(),
    effective_from: new Date().toISOString(),
  } satisfies IEcommerceAdminUserBanOfSeller.ICreate;
  // 4. Create first seller-ban relationship (should succeed)
  const firstAssociation =
    await generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create(
      adminConnection,
      {
        body: relationshipBody,
        params: { adminUserBanId: adminUserBan.id },
      },
    );
  typia.assert(firstAssociation);
  // 5. Verify the seller was associated correctly
  TestValidator.equals(
    "adminUserBan ID matches",
    firstAssociation.administrativeAction.id,
    adminUserBan.id,
  );
  // 6. Attempt duplicate association (should fail)
  await TestValidator.error(
    "duplicate seller-ban relationship should be rejected",
    async () => {
      await generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create(
        adminConnection,
        {
          body: relationshipBody,
          params: { adminUserBanId: adminUserBan.id },
        },
      );
    },
  );
}
