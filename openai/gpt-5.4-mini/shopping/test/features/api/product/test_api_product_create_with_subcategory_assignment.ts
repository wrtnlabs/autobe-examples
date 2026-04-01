import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_products_create } from "../../../generate/generate_random_mall_platform_seller_products_create";
import { prepare_random_mall_platform_product } from "../../../prepare/prepare_random_mall_platform_product";

export async function test_api_product_create_with_subcategory_assignment(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    categoryId,
    basePrice: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IMallPlatformProduct.ICreate;
  const product = await generate_random_mall_platform_seller_products_create(
    sellerConnection,
    {
      body: productBody,
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "seller ownership should be preserved",
    product.sellerAccount.id,
    seller.id,
  );
  TestValidator.equals(
    "product category should match assigned category",
    product.category?.id,
    categoryId,
  );
  TestValidator.equals(
    "product name should match request",
    product.name,
    productBody.name,
  );
  TestValidator.equals(
    "product description should match request",
    product.description,
    productBody.description,
  );
  TestValidator.equals(
    "product base price should match request",
    product.basePrice,
    productBody.basePrice,
  );
  TestValidator.predicate(
    "product should be available for follow-up setup",
    product.deletedAt === null,
  );
}
