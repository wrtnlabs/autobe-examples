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
import { generate_random_ecommerce_administrator_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_administrator_admin_user_bans_create";
import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

/**
 * Test the scenario where an administrator attempts to retrieve a non-existent seller ban relationship.
 * Authenticate as administrator and create an administrative user ban, but attempt to retrieve a
 * seller ban relationship using invalid UUID identifiers. Verify that the system returns a 404 Not
 * Found error with appropriate error messaging.
 */
export async function test_api_administrator_user_ban_relationship_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create an administrative user ban for testing
  const adminUserBan =
    await generate_random_ecommerce_administrator_admin_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "seller",
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_days: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
          >() satisfies number as number,
          appeal_status: "none",
          appeal_reason: null,
        } satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate,
      },
    );
  typia.assert(adminUserBan);
  // 3. Generate invalid UUIDs for non-existent relationship
  const invalidAdminUserBanId = typia.random<string & tags.Format<"uuid">>();
  const invalidSellerBanId = typia.random<string & tags.Format<"uuid">>();
  // 4. Test retrieval of non-existent seller ban relationship
  await TestValidator.httpError(
    "should return 404 for non-existent seller ban relationship",
    404,
    async () => {
      await api.functional.ecommerce.administrator.admin_user_bans.banned_sellers.at(
        adminConnection,
        {
          adminUserBanId: invalidAdminUserBanId,
          sellerBanId: invalidSellerBanId,
        },
      );
    },
  );
}
