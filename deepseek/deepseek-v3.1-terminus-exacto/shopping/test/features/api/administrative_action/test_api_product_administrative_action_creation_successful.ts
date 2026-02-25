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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { generate_random_ecommerce_administrator_administrative_actions_product_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_product_actions_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../../../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_administrative_action_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin_password_123",
      } satisfies IEcommerceAdministrator.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Create parent administrative action
  const parentAction: IEcommerceMetadataRegistryRelationship =
    await generate_random_ecommerce_administrator_administrative_actions_create(
      adminConnection,
      {
        body: {
          action_type: "product_intervention",
          general_description:
            "Administrative action for product testing purposes",
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(parentAction);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller_password_123",
        shop_name: "Test Shop",
        shop_description: "Test shop for administrative action testing",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 4. Create product owned by seller
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        name: "Test Product for Administrative Action",
        description:
          "Product created for testing administrative action functionality",
        base_price: 1000,
        category_id: typia.random<
          string & tags.Format<"uuid">
        >() satisfies string as string & tags.Format<"uuid">,
      } satisfies IEcommerceProduct.ICreate,
    });
  typia.assert(product);
  // 5. Create product administrative action
  const productAction: IEcommerceAdminUserBanOfAdministrator =
    await generate_random_ecommerce_administrator_administrative_actions_product_actions_create(
      adminConnection,
      {
        params: {
          administrativeActionId: parentAction.id,
        },
        body: {
          product_id: product.id,
          action_details: "Product temporarily suspended for review",
          previous_state: "active",
          new_state: "suspended",
        } satisfies IEcommerceAdminUserBanOfAdministrator.ICreate,
      },
    );
  typia.assert(productAction);
  // 6. Validate response
  TestValidator.equals(
    "parent action id matches",
    productAction.administrative_action_id,
    parentAction.id,
  );
  TestValidator.equals(
    "product id matches",
    productAction.product_id,
    product.id,
  );
  TestValidator.equals(
    "action details present",
    typeof productAction.action_details,
    "string",
  );
  TestValidator.equals(
    "previous state matches",
    productAction.previous_state,
    "active",
  );
  TestValidator.equals(
    "new state matches",
    productAction.new_state,
    "suspended",
  );
  TestValidator.predicate(
    "has administrative action summary",
    productAction.administrativeAction !== null,
  );
  TestValidator.predicate(
    "has product summary",
    productAction.product !== null,
  );
  TestValidator.equals(
    "administrative action id in summary",
    productAction.administrativeAction.id,
    parentAction.id,
  );
  TestValidator.equals(
    "product id in summary",
    productAction.product.id,
    product.id,
  );
}
