import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_variant_retrieval_wrong_parent_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Register seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, { body: {} });
  // 3. Register seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, { body: {} });
  // 4. Seller A creates product A
  const productA = await generate_random_e_commerce_mall_seller_products_create(
    sellerAConnection,
    { body: {} },
  );
  typia.assert(productA);
  // 5. Seller B creates product B
  const productB = await generate_random_e_commerce_mall_seller_products_create(
    sellerBConnection,
    { body: {} },
  );
  typia.assert(productB);
  // 6. Seller B creates a variant under product B
  const variantB =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {},
      },
    );
  typia.assert(variantB);
  // 7. As administrator, try to get variant B using product A's ID (wrong parent)
  // This should return a 404 since variant B does not belong to product A
  await TestValidator.httpError(
    "variant retrieval fails with 404 for wrong parent product",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.products.variants.at(
        adminConnection,
        {
          productId: productA.id,
          variantId: variantB.id,
        },
      );
    },
  );
}
