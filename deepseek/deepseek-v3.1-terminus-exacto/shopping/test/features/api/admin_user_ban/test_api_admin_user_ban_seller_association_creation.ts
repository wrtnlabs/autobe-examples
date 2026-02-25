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

export async function test_api_admin_user_ban_seller_association_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" as string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent admin user ban record
  const adminUserBan =
    await api.functional.ecommerce.administrator.admin_user_bans.create(
      adminConnection,
      {
        body: {
          user_type: "seller",
          ban_reason: "Violation of platform policies",
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<30> & tags.Maximum<365>
          >(),
          appeal_status: "none",
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // 3. Create banned seller relationship
  const bannedSeller =
    await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.create(
      adminConnection,
      {
        adminUserBanId: adminUserBan.id,
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<7> & tags.Maximum<90>
          >(),
          restriction_scope: "all_products",
          effective_from: new Date().toISOString(),
          effective_until: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceAdminUserBanOfSeller.ICreate,
      },
    );
  typia.assert(bannedSeller);
  // 4. Validate the returned relationship record
  TestValidator.equals("id exists", typeof bannedSeller.id, "string");
  TestValidator.equals(
    "intervention type",
    bannedSeller.intervention_type,
    "account_suspension",
  );
  TestValidator.predicate(
    "suspension duration valid",
    bannedSeller.suspension_duration_days !== null &&
      Number(bannedSeller.suspension_duration_days) > 0,
  );
  TestValidator.equals(
    "restriction scope",
    bannedSeller.restriction_scope,
    "all_products",
  );
  TestValidator.predicate(
    "effective from valid",
    new Date(bannedSeller.effective_from) <= new Date(),
  );
  TestValidator.predicate(
    "effective until valid",
    bannedSeller.effective_until === null ||
      new Date(bannedSeller.effective_until) > new Date(),
  );
  // 5. Validate administrative action attribution
  TestValidator.equals(
    "administrative action id",
    typeof bannedSeller.administrativeAction.id,
    "string",
  );
  TestValidator.equals(
    "administrative action type",
    typeof bannedSeller.administrativeAction.action_type,
    "string",
  );
  TestValidator.equals(
    "administrative action description",
    typeof bannedSeller.administrativeAction.general_description,
    "string",
  );
  TestValidator.predicate(
    "administrative action timestamp",
    new Date(bannedSeller.administrativeAction.created_at) <= new Date(),
  );
  // 6. Validate seller information
  TestValidator.equals("seller id", typeof bannedSeller.seller.id, "string");
  TestValidator.equals(
    "seller email",
    typeof bannedSeller.seller.email,
    "string",
  );
  TestValidator.predicate(
    "seller shop name",
    bannedSeller.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller account status",
    [
      "pending_approval",
      "approved",
      "rejected",
      "suspended",
      "active",
    ].includes(bannedSeller.seller.account_status),
  );
  TestValidator.predicate(
    "seller creation timestamp",
    new Date(bannedSeller.seller.created_at) <= new Date(),
  );
}
