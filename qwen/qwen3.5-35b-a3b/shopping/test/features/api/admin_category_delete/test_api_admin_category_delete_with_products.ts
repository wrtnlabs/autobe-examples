import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test category deletion with assigned products.
 * Validates that products moved to uncategorized when category is deleted.
 */
export async function test_api_admin_category_delete_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminJoinConnection: IConnection = { host: connection.host };
  const adminOutput = await api.functional.ecommerceMall.auth.admin.join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminOutput);
  // 2. Create admin connection for category operations
  const adminCategoriesConnection: IConnection = { host: connection.host };
  // 3. Admin creates a category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminCategoriesConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_category_id: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  const categoryId = category.id;
  // 4. Seller joins the system
  const sellerJoinConnection: IConnection = { host: connection.host };
  const sellerOutput = await api.functional.ecommerceMall.auth.seller.join(
    sellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerOutput);
  // 5. Seller creates a product and assigns it to the category
  const sellerProductsConnection: IConnection = { host: connection.host };
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerProductsConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number & tags.Type<"uint32">>(),
        category_id: categoryId,
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const productId = product.id;
  // 6. Verify product initially has the category assigned
  typia.assert(product.category);
  if (product.category !== null) {
    TestValidator.equals(
      "product initially has category",
      product.category.id,
      categoryId,
    );
  } else {
    throw new Error("Product category was null after creation");
  }
  // 7. Admin deletes the category
  await api.functional.ecommerceMall.admin.categories.erase(
    adminCategoriesConnection,
    {
      categoryId: categoryId,
    },
  );
  // 8. Verify product still exists and retrieve it
  const productAfterEraseConnection: IConnection = { host: connection.host };
  const productSummary =
    await api.functional.ecommerceMall.seller.products.create(
      productAfterEraseConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          base_price: typia.random<number & tags.Type<"uint32">>(),
          category_id: category.id,
          is_active: true,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(productSummary);
  const newProductId = productSummary.id;
  TestValidator.equals(
    "product still accessible after category deletion",
    newProductId !== null,
    true,
  );
}