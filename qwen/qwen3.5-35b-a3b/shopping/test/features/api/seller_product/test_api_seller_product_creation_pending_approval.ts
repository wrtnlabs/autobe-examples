import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_seller_product_creation_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller (will have pending approval status by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 2. Create seller-specific connection with authentication token
  const pendingSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: seller.token.access },
  };
  // 3. Attempt to create a product with valid data (should fail - seller pending)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  // 4. Verify product creation fails for pending approval seller
  await TestValidator.error(
    "seller with pending approval cannot create products",
    async () => {
      await api.functional.ecommerceMall.seller.products.create(
        pendingSellerConnection,
        {
          body: {
            name: productName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            category_id: categoryId,
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          } satisfies IEcommerceMallProduct.ICreate,
        },
      );
    },
  );
  // 5. Verify seller's account status remains pending
  TestValidator.equals(
    "seller account status remains pending",
    (seller as unknown as { status: string }).status,
    "pending",
  );
}