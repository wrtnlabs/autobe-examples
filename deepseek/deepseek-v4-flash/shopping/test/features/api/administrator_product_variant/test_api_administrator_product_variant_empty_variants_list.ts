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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductVariant";
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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test that listing variants for a product with no variants returns an empty paginated page.
 *
 * Validates the edge case where a product exists but has no variants configured. The variant listing endpoint should return HTTP 200 with an empty `data` array and pagination metadata indicating zero records and pages, rather than treating the absence of variants as an error condition.
 *
 * This scenario covers the product detail page's variant selector display when the product is marked as unavailable, and the seller-facing variant management view for a product with no SKUs created yet.
 *
 * 1. Administrator authenticates via join.
 * 2. Seller authenticates via join.
 * 3. Seller creates a product (without creating any variants).
 * 4. Administrator calls the variant listing endpoint for that product with default page/limit pagination.
 * 5. Validates that the response is a valid paginated structure, the data array is empty, and pagination metadata reflects zero total records.
 */
export async function test_api_administrator_product_variant_empty_variants_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  // 2. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IECommerceMallSeller.IJoin>(),
  });
  // 3. Seller creates a product WITHOUT any variants
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Administrator lists variants for the product with default pagination
  const page =
    await api.functional.eCommerceMall.administrator.products.variants.index(
      adminConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IECommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page);
  // 5. Validate the empty variant list
  TestValidator.equals("variant data is empty", page.data, []);
  TestValidator.equals("pagination records is 0", page.pagination.records, 0);
  TestValidator.equals("pagination pages is 0", page.pagination.pages, 0);
  TestValidator.equals("pagination current is 1", page.pagination.current, 1);
  TestValidator.equals("pagination limit is 20", page.pagination.limit, 20);
}
