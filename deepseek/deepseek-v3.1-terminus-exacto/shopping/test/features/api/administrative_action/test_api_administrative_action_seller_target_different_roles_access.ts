import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
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
import { generate_random_ecommerce_administrator_administrative_actions_seller_targets_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_seller_targets_create";
import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Test different user roles accessing seller target information within administrative actions.
 * Validates that only administrators can access administrative action seller target details,
 * while customers and sellers are properly denied access.
 */
export async function test_api_administrative_action_seller_target_different_roles_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup administrator account and create test data
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword123",
  } satisfies IEcommerceAdministrator.IJoin;
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  await authorize_administrator_login(adminConnection, {
    body: adminCredentials,
  });
  // Create administrative action using utility function
  const administrativeAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "seller_intervention",
          general_description:
            "Test administrative action for access control validation",
        },
      },
    );
  typia.assert(administrativeAction);
  // Create seller target using utility function
  const sellerTarget =
    await generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
      adminConnection,
      {
        params: {
          administrativeActionId: administrativeAction.id,
        },
        body: {
          intervention_type: "account_suspension",
          suspension_duration_days: 7,
          effective_from: new Date().toISOString(),
        },
      },
    );
  typia.assert(sellerTarget);
  // Step 2: Test administrator access (should succeed)
  const adminAccessResult =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.at(
      adminConnection,
      {
        administrativeActionId: administrativeAction.id,
        sellerTargetId: sellerTarget.id,
      },
    );
  typia.assert(adminAccessResult);
  TestValidator.equals(
    "administrator should access seller target",
    adminAccessResult.id,
    sellerTarget.id,
  );
  // Step 3: Setup customer account and test access (should fail)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CustomerPassword123",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IEcommerceCustomer.IJoin;
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  await authorize_customer_login(customerConnection, {
    body: customerCredentials,
  });
  await TestValidator.error("customer should be denied access", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.at(
      customerConnection,
      {
        administrativeActionId: administrativeAction.id,
        sellerTargetId: sellerTarget.id,
      },
    );
  });
  // Step 4: Setup seller account and test access (should fail)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassword123",
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  await authorize_seller_login(sellerConnection, { body: sellerCredentials });
  await TestValidator.error("seller should be denied access", async () => {
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.at(
      sellerConnection,
      {
        administrativeActionId: administrativeAction.id,
        sellerTargetId: sellerTarget.id,
      },
    );
  });
}
