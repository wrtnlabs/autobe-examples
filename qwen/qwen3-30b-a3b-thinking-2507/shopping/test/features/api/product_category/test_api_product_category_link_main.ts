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

export async function test_api_product_category_link_main(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {},
    },
  );
  // 2. Create product (creates main category link with order=0)
  const product: IEcommerceProduct =
    await generate_random_ecommerce_seller_products_create(sellerConnection, {
      body: {},
    });
  // 3. Verify main category link (order=0) with correct link ID
  const link: IEcommerceProductCategoryLink =
    await api.functional.ecommerce.products.categories.at(sellerConnection, {
      productId: product.id,
      categoryLinkId: product.category.id,
    });
  typia.assert(link);
  // 4. Validate key business requirements
  TestValidator.equals("order should be 0 (main category)", link.order, 0);
  TestValidator.equals("deleted_at should be null", link.deleted_at, null);
  TestValidator.predicate("created_at valid ISO8601 with Z suffix", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(link.created_at),
  );
  TestValidator.predicate("updated_at valid ISO8601 with Z suffix", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(link.updated_at),
  );
  TestValidator.equals(
    "product associations match",
    link.product.id,
    product.id,
  );
  TestValidator.equals(
    "category associations match",
    link.category.id,
    product.category.id,
  );
}
