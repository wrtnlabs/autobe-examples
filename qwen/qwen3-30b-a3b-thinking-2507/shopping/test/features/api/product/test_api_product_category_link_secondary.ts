import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductCategoryLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductCategoryLink";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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

export async function test_api_product_category_link_secondary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secretPassword123",
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEcommerceSeller.IJoin,
  });
  // 2. Create a product as a seller
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  // 3. Get a secondary category link for the product (order > 0)
  const categoryLinkId = typia.random<string & tags.Format<"uuid">>();
  const categoryLink = await api.functional.ecommerce.products.categories.at(
    sellerConnection,
    {
      productId: product.id,
      categoryLinkId: categoryLinkId,
    },
  );
  typia.assert(categoryLink);
  // 4. Validate that the order is greater than 0 (secondary category link)
  TestValidator.predicate(
    "secondary category link order is greater than 0",
    categoryLink.order > 0,
  );
}
