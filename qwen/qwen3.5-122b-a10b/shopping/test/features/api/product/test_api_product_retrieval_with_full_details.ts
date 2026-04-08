import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_retrieval_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 2. Seller creates a product with variants and images
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {
        category_id: typia.random<string>(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceProduct.ICreate,
    });
  typia.assert(product);
  // 3. Customer retrieves the product
  const retrieved: IEcommerceProduct =
    await api.functional.ecommerce.products.at(connection, {
      productId: product.id,
    });
  typia.assert(retrieved);
  // 4. Validate product details match
  TestValidator.equals("product id matches", retrieved.id, product.id);
  TestValidator.equals("product name matches", retrieved.name, product.name);
  TestValidator.equals(
    "product description matches",
    retrieved.description,
    product.description,
  );
  TestValidator.equals(
    "base price matches",
    retrieved.basePrice,
    product.basePrice,
  );
  // 5. Validate seller information
  TestValidator.equals("seller id matches", retrieved.seller.id, sellerAuth.id);
  TestValidator.predicate(
    "seller is approved",
    retrieved.seller.approval_status === "approved",
  );
  TestValidator.predicate(
    "seller has shop name",
    retrieved.seller.shop_name.length > 0,
  );
  // 6. Validate category information
  TestValidator.predicate("category has id", retrieved.category.id.length > 0);
  TestValidator.predicate(
    "category has name",
    retrieved.category.name.length > 0,
  );
  // 7. Validate product images are ordered by display_order
  TestValidator.predicate(
    "has at least one image",
    retrieved.productImages.length > 0,
  );
  const displayOrders = retrieved.productImages.map((img) => img.displayOrder);
  TestValidator.predicate(
    "images are sorted by display_order",
    displayOrders.every(
      (order, idx) => idx === 0 || order >= displayOrders[idx - 1],
    ),
  );
  // 8. Validate variants exist with required fields
  TestValidator.predicate(
    "has at least one variant",
    retrieved.variants.length > 0,
  );
  for (const variant of retrieved.variants) {
    TestValidator.predicate(
      "variant has sku_code",
      variant.sku_code.length > 0,
    );
    TestValidator.predicate(
      "variant has option_values",
      variant.option_values.length > 0,
    );
    TestValidator.predicate(
      "variant stock_quantity is non-negative",
      variant.stock_quantity >= 0,
    );
  }
  // 9. Validate product is active
  TestValidator.predicate(
    "product is active (deleted_at is null)",
    retrieved.deletedAt === null,
  );
}