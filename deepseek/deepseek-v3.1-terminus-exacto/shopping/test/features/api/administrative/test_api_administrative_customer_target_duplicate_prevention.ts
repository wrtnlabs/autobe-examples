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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_customer_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_customer_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Test the system's prevention of duplicate customer targeting records.
 * Validates that the business rule enforcement prevents multiple targeting records
 * for the same administrative action and customer combination, ensuring data integrity
 * in the audit trail system.
 */
export async function test_api_administrative_customer_target_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create administrative action
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "customer_ban",
          general_description:
            "Test administrative action for duplicate prevention",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Create first customer targeting record
  const firstTarget =
    await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
      adminConnection,
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
        body: {
          ecommerce_administrative_action_id: administrativeAction.id,
          ecommerce_customer_id: customerAuth.id,
        } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
      },
    );
  typia.assert(firstTarget);
  // 5. Attempt to create duplicate targeting record
  await TestValidator.error(
    "duplicate customer targeting should be rejected",
    async () => {
      await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
        adminConnection,
        {
          params: {
            administrativeActionId: administrativeAction.id,
          },
          body: {
            ecommerce_administrative_action_id: administrativeAction.id,
            ecommerce_customer_id: customerAuth.id,
          } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
        },
      );
    },
  );
  // 6. Verify first record remains intact
  TestValidator.equals(
    "first targeting record should remain unchanged",
    firstTarget.administrativeAction.id,
    administrativeAction.id,
  );
  TestValidator.equals(
    "first targeting record customer should remain unchanged",
    firstTarget.customer.id,
    customerAuth.id,
  );
}
