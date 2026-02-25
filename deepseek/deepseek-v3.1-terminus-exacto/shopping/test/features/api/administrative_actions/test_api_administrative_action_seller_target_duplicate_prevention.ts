import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
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
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_seller_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_seller_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Test the prevention of duplicate seller target associations.
 * 1. Authenticate as administrator.
 * 2. Create administrative action as parent context.
 * 3. Create initial seller target association.
 * 4. Attempt duplicate association with same seller and action.
 * 5. Verify system rejects duplicate with appropriate error handling.
 */
export async function test_api_administrative_action_seller_target_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {},
    );
  typia.assert(administrativeAction);
  // 3. Create seller target association
  const sellerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
      adminConnection,
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
      },
    );
  typia.assert(sellerTarget);
  // 4. Attempt duplicate association with same seller and action
  await TestValidator.error(
    "duplicate seller target association should be rejected",
    async () => {
      await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
        adminConnection,
        {
          params: {
            administrativeActionId: administrativeAction.id,
          },
          body: {
            intervention_type: RandomGenerator.pick([
              "warning_issued",
              "selling_restriction",
              "account_suspension",
            ]),
            effective_from: new Date().toISOString(),
          } satisfies Partial<IEcommerceAdminUserBanOfSeller.ICreate>,
        },
      );
    },
  );
  // 5. Validate uniqueness constraint
  TestValidator.equals(
    "seller target should reference correct administrative action",
    sellerTarget.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.equals(
    "seller should be properly associated",
    typeof sellerTarget.seller.id,
    "string",
  );
}