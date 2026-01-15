import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerBillingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBillingAddress";
import type { IShoppingMallSellerOnboardingProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerOnboardingProgress";
import type { IShoppingMallSellerPayoutSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutSettings";
import type { IShoppingMallSellerPerformanceMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceMetrics";
import type { IShoppingMallSellerSocialMediaHandles } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSocialMediaHandles";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_tags_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      business_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // sellerConnection.headers is now updated internally by authorize function
  // Step 2: Create a product with valid attributes
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.content(),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        price: (typia.random<number & tags.Minimum<0.01>>() satisfies number as number),
        sku: RandomGenerator.alphaNumeric(10),
        images: ArrayUtil.repeat(
          typia.random<number & tags.Type<"uint32">>(),
          () => {
            return typia.random<string & tags.Format<"uri">>();
          },
        ),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Retrieve product tags using product ID
  const tagsResponse = await api.functional.shoppingMall.products.tags.index(
    sellerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(tagsResponse);
}