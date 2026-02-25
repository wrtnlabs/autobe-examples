import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
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
import { generate_random_ecommerce_administrator_administrative_actions_product_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_product_actions_create";
import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_administrative_actions_product_action_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create parent administrative action
  const parentAction =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: RandomGenerator.alphabets(10),
          general_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(parentAction);
  // 3. Create product action within the parent administrative action
  // Note: Generating random product_id since we cannot create actual products in this test
  const productAction =
    await generate_random_ecommerce_administrator_administrative_actions_product_actions_create(
      adminConnection,
      {
        params: { administrativeActionId: parentAction.id },
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          action_details: RandomGenerator.paragraph({ sentences: 3 }),
          previous_state: RandomGenerator.alphabets(8),
          new_state: RandomGenerator.alphabets(8),
        } satisfies IEcommerceAdminUserBanOfAdministrator.ICreate,
      },
    );
  typia.assert(productAction);
  // 4. Retrieve the specific product action
  const retrievedAction =
    await api.functional.ecommerce.administrator.administrative_actions.product_actions.at(
      adminConnection,
      {
        administrativeActionId: parentAction.id,
        productActionId: productAction.id,
      },
    );
  typia.assert(retrievedAction);
  // 5. Validate response completeness and relationships
  TestValidator.equals(
    "product action ID matches",
    retrievedAction.id,
    productAction.id,
  );
  TestValidator.equals(
    "administrative action ID matches",
    retrievedAction.administrative_action_id,
    parentAction.id,
  );
  TestValidator.equals(
    "product ID matches",
    retrievedAction.product_id,
    productAction.product_id,
  );
  TestValidator.equals(
    "action details match",
    retrievedAction.action_details,
    productAction.action_details,
  );
  TestValidator.equals(
    "previous state matches",
    retrievedAction.previous_state,
    productAction.previous_state,
  );
  TestValidator.equals(
    "new state matches",
    retrievedAction.new_state,
    productAction.new_state,
  );
  // 6. Validate relationship integrity
  TestValidator.equals(
    "parent administrative action relationship",
    retrievedAction.administrativeAction.id,
    parentAction.id,
  );
  TestValidator.equals(
    "product relationship integrity",
    retrievedAction.product.id,
    productAction.product_id,
  );
  TestValidator.predicate(
    "parent-child foreign key relationship valid",
    () =>
      retrievedAction.administrativeAction.id ===
      retrievedAction.administrative_action_id,
  );
}
