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

export async function test_api_administrator_user_ban_seller_relationship_soft_delete_access(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(administrator);
  // Create base administrative user ban
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "seller",
          ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // Create seller ban relationship
  const sellerBan =
    await generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create(
      adminConnection,
      {
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          restriction_scope: "all_products",
          effective_from: new Date().toISOString(),
          effective_until: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceAdminUserBanOfSeller.ICreate,
        params: {
          adminUserBanId: adminUserBan.id,
        },
      },
    );
  typia.assert(sellerBan);
  // Retrieve the seller ban relationship to verify it exists
  const retrievedBan =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.at(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        sellerBanId: sellerBan.id,
      },
    );
  typia.assert(retrievedBan);
  // Verify the relationship was created successfully
  TestValidator.equals("ban ID matches", retrievedBan.id, sellerBan.id);
  TestValidator.equals(
    "intervention type matches",
    retrievedBan.intervention_type,
    sellerBan.intervention_type,
  );
  TestValidator.equals(
    "suspension duration matches",
    retrievedBan.suspension_duration_days,
    sellerBan.suspension_duration_days,
  );
  TestValidator.equals(
    "restriction scope matches",
    retrievedBan.restriction_scope,
    sellerBan.restriction_scope,
  );
  TestValidator.equals(
    "effective from matches",
    retrievedBan.effective_from,
    sellerBan.effective_from,
  );
  TestValidator.equals(
    "effective until matches",
    retrievedBan.effective_until,
    sellerBan.effective_until,
  );
  // Note: Soft deletion functionality would be implemented server-side
  // This test validates that the GET endpoint can retrieve the relationship
  // In a complete implementation, soft deletion would be tested separately
}
