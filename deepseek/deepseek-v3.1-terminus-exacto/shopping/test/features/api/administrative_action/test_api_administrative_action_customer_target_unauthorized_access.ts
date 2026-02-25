import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_customer_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_customer_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Verify unauthorized access prevention for administrative action customer target retrieval.
 * Tests that non-administrator roles cannot access sensitive administrative oversight records.
 */
export async function test_api_administrative_action_customer_target_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create administrator and generate test data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create administrative action using utility function
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "customer_ban",
          general_description: "Test customer banning action",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(administrativeAction);
  // Create customer account for targeting
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Create customer target record using utility function
  const customerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_customer_targets_create(
      adminConnection,
      {
        params: { administrativeActionId: administrativeAction.id },
        body: {
          ecommerce_customer_id: customerAuth.id,
          ecommerce_administrative_action_id: administrativeAction.id,
        } satisfies IEcommerceAdminUserBanOfCustomer.ICreate,
      },
    );
  typia.assert(customerTarget);
  // Test 1: Customer role unauthorized access attempt
  await TestValidator.error("customer unauthorized access", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
      customerConnection,
      {
        administrativeActionId: administrativeAction.id,
        customerTargetId: customerTarget.id,
      },
    );
  });
  // Test 2: Seller role unauthorized access attempt
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  await TestValidator.error("seller unauthorized access", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
      sellerConnection,
      {
        administrativeActionId: administrativeAction.id,
        customerTargetId: customerTarget.id,
      },
    );
  });
  // Test 3: Unauthenticated connection access attempt
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthenticated access", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
      unauthenticatedConnection,
      {
        administrativeActionId: administrativeAction.id,
        customerTargetId: customerTarget.id,
      },
    );
  });
  // Test 4: Valid administrator access (should succeed)
  const validAccess =
    await api.functional.ecommerce.administrator.administrative_actions.customer_targets.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        customerTargetId: customerTarget.id,
      },
    );
  typia.assert(validAccess);
  TestValidator.equals(
    "administrator access succeeds",
    validAccess.id,
    customerTarget.id,
  );
}