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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_variant_list_unavailable_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: sellerPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string,
    },
  });
  typia.assert(sellerAuthorized);
  // 2. Seller login to get session for product creation
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuthorized.email,
      password: sellerPassword,
    },
  });
  // 3. Product creation - create a product without variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }) || null,
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >() satisfies number as number,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Validate product was created with empty variants
  TestValidator.equals("product has no variants", product.variants.length, 0);
  // 4. Customer setup - create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string,
      password: customerPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string,
    },
  });
  // 5. Customer retrieves product variants (which should be empty)
  const variantsPage =
    await api.functional.ecommerceMall.products.variants.index(
      customerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(variantsPage);
  // 6. Validation - check empty variants response with 200 OK
  TestValidator.equals("variants list is empty", variantsPage.data.length, 0);
  TestValidator.equals(
    "pagination records count",
    variantsPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    variantsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination pages", variantsPage.pagination.pages, 0);
}