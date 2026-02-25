import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_creation_registered_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin_password_123",
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Create category as administrator
  const category =
    await api.functional.ecommerce.administrator.categories.create(
      adminConnection,
      {
        body: {
          name:
            "Test Category " +
            typia.random<string & tags.Format<"uuid">>().substring(0, 8),
          description: "Test category description",
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller setup - create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "seller_password_123",
        shop_name: "Test Shop",
        shop_description: "Test shop description",
        logo_image_url: "https://example.com/logo.png",
        href: "https://example.com",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 4. Create product with valid category
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description for validation",
        base_price: 1000,
        category_id: category.id,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Validate successful product creation with correct category
  if (product.category.id !== category.id) {
    throw new Error(
      `Category ID mismatch: expected ${category.id}, got ${product.category.id}`,
    );
  }
  if (product.category.name !== category.name) {
    throw new Error(
      `Category name mismatch: expected ${category.name}, got ${product.category.name}`,
    );
  }
  if (product.base_price !== 1000) {
    throw new Error(
      `Base price mismatch: expected 1000, got ${product.base_price}`,
    );
  }
  // 6. Test error scenario - try to create product with invalid category
  await TestValidator.error("should reject invalid category", async () => {
    await api.functional.ecommerce.seller.products.create(sellerConnection, {
      body: {
        name: "Invalid Category Product",
        description: "Product with non-existent category",
        base_price: 500,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    });
  });
}
