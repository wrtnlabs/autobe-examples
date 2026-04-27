import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_detail_view_unavailable_no_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create a product without any variants, without a category
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // 3. Customer setup - join as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Fetch product detail as customer
  const productDetail = await api.functional.eCommerceMall.customer.products.at(
    customerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // 5. Validate product identity
  TestValidator.equals("product id", productDetail.id, product.id);
  TestValidator.equals("product name", productDetail.name, product.name);
  TestValidator.equals(
    "product description",
    productDetail.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price",
    productDetail.base_price,
    product.base_price,
  );
  // 6. Validate visibility is 'unavailable_but_visible' (no variants exist)
  TestValidator.equals(
    "visibility is unavailable_but_visible",
    productDetail.visibility,
    "unavailable_but_visible",
  );
  // 7. Validate empty arrays
  TestValidator.equals("variants array is empty", productDetail.variants, []);
  TestValidator.equals("images array is empty", productDetail.images, []);
  // 8. Validate seller is present with shop_name
  TestValidator.predicate(
    "seller is present",
    () => productDetail.seller != null,
  );
  TestValidator.predicate(
    "seller profile has shop_name",
    () => typeof productDetail.seller.profile.shop_name === "string",
  );
  // 9. Validate category is null (no category assigned)
  TestValidator.equals("category is null", productDetail.category, null);
  // 10. Validate computed review values
  TestValidator.equals(
    "average_rating is null",
    productDetail.average_rating,
    null,
  );
  TestValidator.equals("review_count is 0", productDetail.review_count, 0);
}
