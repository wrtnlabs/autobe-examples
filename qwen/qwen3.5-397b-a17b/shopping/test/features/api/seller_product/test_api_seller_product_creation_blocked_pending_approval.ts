import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test business rule that sellers with pending approval status cannot create products.
 *
 * Validates the complete seller approval workflow including seller registration with pending status, administrator category creation as prerequisite, and product creation attempt by pending seller. Ensures that the system correctly rejects product creation requests from sellers who have not yet been approved by administrators.
 *
 * Special attention is given to verifying that the rejection occurs before any product creation logic executes, maintaining data integrity by preventing unapproved sellers from listing products on the platform.
 *
 * 1. Seller registers via join flow which creates account with pending approval_status.
 * 2. Admin creates a category as prerequisite for product creation.
 * 3. Pending seller attempts to create product with valid data including name, description, category, and base price.
 * 4. Request is rejected with appropriate error indicating approval is required.
 * 5. Validates that no product record is created in the database by confirming the error response.
 */
export async function test_api_seller_product_creation_blocked_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registers (creates account with pending approval_status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller has pending approval status
  TestValidator.equals(
    "seller approval status",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Admin creates category as prerequisite
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Pending seller attempts to create product with valid data
  const productCreationBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    shopping_mall_category_id: category.id,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
  } satisfies IShoppingMallProduct.ICreate;
  // 4. Request should be rejected - pending seller cannot create products
  await TestValidator.error(
    "pending seller cannot create products",
    async () => {
      await api.functional.shoppingMall.seller.products.create(
        sellerConnection,
        {
          body: productCreationBody,
        },
      );
    },
  );
}
