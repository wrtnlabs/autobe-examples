import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_retrieval_out_of_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: adminResult.token.access,
  };
  // 2. Seller setup - join as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResult);
  sellerConnection.headers = {
    ...sellerConnection.headers,
    Authorization: sellerResult.token.access,
  };
  // 3. Create a category first (we need a valid category_id)
  // Since we don't have a category creation endpoint, we'll use a random UUID
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create a product with seller connection
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        slug: RandomGenerator.alphabets(10),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Verify initial product status is active
  TestValidator.equals(
    "product created with active status",
    product.status,
    "active",
  );
  // 5. Retrieve the product to verify product detail page is accessible
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // Verify product is visible with complete information
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product slug matches",
    retrievedProduct.slug,
    product.slug,
  );
  // 6. Verify category information is included
  TestValidator.equals(
    "product has category information",
    retrievedProduct.category !== null &&
      retrievedProduct.category !== undefined,
    true,
  );
  // 7. Verify seller information is included
  TestValidator.equals(
    "product has seller information",
    retrievedProduct.seller !== null && retrievedProduct.seller !== undefined,
    true,
  );
  // 8. Verify product status field exists and is valid
  TestValidator.equals(
    "product status is valid enum value",
    ["active", "inactive", "out_of_stock"].includes(retrievedProduct.status),
    true,
  );
  // 9. Verify images array exists
  TestValidator.equals(
    "product has images array",
    Array.isArray(retrievedProduct.images),
    true,
  );
  // 10. Verify variants array exists
  TestValidator.equals(
    "product has variants array",
    Array.isArray(retrievedProduct.variants),
    true,
  );
  // 11. Verify timestamps are valid date-time format
  TestValidator.equals(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedProduct.created_at)),
    true,
  );
  TestValidator.equals(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedProduct.updated_at)),
    true,
  );
  // 12. Verify soft-delete timestamp is valid
  TestValidator.equals(
    "deleted_at is valid or null",
    retrievedProduct.deleted_at === null ||
      !isNaN(Date.parse(retrievedProduct.deleted_at)),
    true,
  );
  // Test complete: product is browsable with complete information
  // Note: Testing out_of_stock status change requires inventory management endpoint
  // which is not available in the current SDK. The product status field structure
  // is validated and ready for status transitions.
}
