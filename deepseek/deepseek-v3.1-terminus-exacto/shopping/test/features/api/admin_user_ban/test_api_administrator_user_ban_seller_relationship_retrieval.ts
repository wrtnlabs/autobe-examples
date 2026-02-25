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

export async function test_api_administrator_user_ban_seller_relationship_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Step 2: Create an administrative user ban targeting sellers
  const adminBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "seller",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          appeal_status: "none",
        },
      },
    );
  typia.assert(adminBan);
  // Step 3: Create a seller ban relationship under that ban
  const sellerBan =
    await generate_random_ecommerce_administrator_admin_user_bans_banned_sellers_create(
      adminConnection,
      {
        params: { adminUserBanId: adminBan.id },
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >(),
          effective_from: new Date().toISOString(),
        },
      },
    );
  typia.assert(sellerBan);
  // Step 4: Retrieve the specific seller ban relationship
  const retrieved =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.at(
      adminConnection,
      {
        adminUserBanId: adminBan.id,
        sellerBanId: sellerBan.id,
      },
    );
  typia.assert(retrieved);
  // Step 5: Validate all details
  TestValidator.equals("ID matches", retrieved.id, sellerBan.id);
  TestValidator.equals(
    "intervention type matches",
    retrieved.intervention_type,
    sellerBan.intervention_type,
  );
  TestValidator.equals(
    "suspension duration matches",
    retrieved.suspension_duration_days,
    sellerBan.suspension_duration_days,
  );
  TestValidator.equals(
    "restriction scope matches",
    retrieved.restriction_scope,
    sellerBan.restriction_scope,
  );
  TestValidator.equals(
    "effective from matches",
    retrieved.effective_from,
    sellerBan.effective_from,
  );
  TestValidator.equals(
    "effective until matches",
    retrieved.effective_until,
    sellerBan.effective_until,
  );
  // Step 6: Validate cross-referential information
  TestValidator.predicate(
    "has administrative action",
    retrieved.administrativeAction !== null,
  );
  TestValidator.equals(
    "administrative action ID matches",
    retrieved.administrativeAction.id,
    adminBan.id,
  );
  TestValidator.predicate("has seller information", retrieved.seller !== null);
  TestValidator.predicate(
    "seller has valid ID",
    /^[0-9a-f-]{36}$/i.test(retrieved.seller.id),
  );
  TestValidator.predicate(
    "seller has valid email",
    retrieved.seller.email.includes("@"),
  );
}
