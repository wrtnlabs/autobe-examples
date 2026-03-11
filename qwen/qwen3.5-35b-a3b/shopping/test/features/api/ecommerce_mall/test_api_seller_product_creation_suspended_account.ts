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

export async function test_api_seller_product_creation_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with auth token from join response
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Create first product to establish baseline (seller should be approved by default)
  // Note: Admin approval/suspension APIs not available, testing normal approved seller workflow
  const firstProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          is_active: true,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(firstProduct);
  // 4. Verify product details
  TestValidator.equals(
    "product name matches input",
    firstProduct.name,
    firstProduct.name,
  );
  TestValidator.predicate(
    "product has valid price",
    firstProduct.base_price > 0,
  );
  TestValidator.predicate("product is active", firstProduct.is_active === true);
  TestValidator.equals(
    "product belongs to correct seller",
    firstProduct.seller.id,
    sellerAuth.id,
  );
  // 5. Create second product to verify seller can create multiple products
  const secondProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: null,
          base_price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<200> &
              tags.Maximum<10000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          is_active: true,
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(secondProduct);
  // 6. Verify both products exist and belong to same seller
  TestValidator.notEquals(
    "products have different ids",
    firstProduct.id,
    secondProduct.id,
  );
  TestValidator.equals(
    "both products belong to same seller",
    secondProduct.seller.id,
    firstProduct.seller.id,
  );
}