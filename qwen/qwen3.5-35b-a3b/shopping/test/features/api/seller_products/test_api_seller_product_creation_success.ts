import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: joinInput,
  });
  typia.assert(seller);
  // Create new connection for authenticated seller using the returned token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  // 2. Create product with valid data - store input for validation
  const productInput = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<number & tags.Minimum<1>>(),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    is_active: true,
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await api.functional.ecommerceMall.seller.products.create(
    authenticatedSellerConnection,
    { body: productInput },
  );
  typia.assert(product);
  // 3. Validate product creation matches input
  TestValidator.equals(
    "product name matches input",
    product.name,
    productInput.name,
  );
  TestValidator.equals(
    "description matches input",
    product.description,
    productInput.description,
  );
  TestValidator.equals(
    "base price matches input",
    product.base_price,
    productInput.base_price,
  );
  TestValidator.equals(
    "category id matches input",
    product.category.id,
    productInput.category_id,
  );
  TestValidator.equals(
    "product is active",
    product.is_active,
    productInput.is_active,
  );
  // 4. Validate timestamps are valid dates
  TestValidator.predicate(
    "created_at is valid date",
    () => !isNaN(Date.parse(product.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    () => !isNaN(Date.parse(product.updated_at)),
  );
  // 5. Validate seller relationship through product.seller
  TestValidator.equals(
    "seller email matches registered seller",
    product.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller is not suspended",
    product.seller.isSuspended,
    false,
  );
  TestValidator.equals("seller is not banned", product.seller.isBanned, false);
  // 6. Validate product is immediately visible (is_active = true means visible)
  TestValidator.predicate(
    "product is visible in catalog",
    product.is_active === true,
  );
  // 7. Validate required arrays are present
  TestValidator.equals(
    "variants array initialized",
    product.variants.length,
    0,
  );
  TestValidator.equals("images array initialized", product.images.length, 0);
  TestValidator.equals("reviews array initialized", product.reviews.length, 0);
  TestValidator.equals(
    "snapshots array initialized",
    product.snapshots.length,
    0,
  );
  // 8. Validate count fields are initialized
  TestValidator.equals(
    "wishlist entries count is 0",
    product.wishlist_entries_count,
    0,
  );
  TestValidator.equals("order items count is 0", product.order_items_count, 0);
  TestValidator.equals("reviews count is 0", product.reviews_count, 0);
}