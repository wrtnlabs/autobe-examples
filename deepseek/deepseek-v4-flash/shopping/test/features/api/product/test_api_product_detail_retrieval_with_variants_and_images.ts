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
import type { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerApprovalRequest";
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
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_detail_retrieval_with_variants_and_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: typia.random<IECommerceMallAdministrator.IJoin>(),
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 3. Seller submits approval request
  const approvalRequest =
    await api.functional.eCommerceMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  TestValidator.equals(
    "approval request status is pending",
    approvalRequest.status,
    "pending",
  );
  // 4. Admin lists pending approval requests
  const adminList =
    await api.functional.eCommerceMall.administrator.approval_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IECommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(adminList);
  TestValidator.predicate(
    "admin list has pending requests",
    adminList.data.length > 0,
  );
  // 5. Find the seller's request
  const requestId = adminList.data.find(
    (item) => item.seller.id === sellerAuth.id,
  )!.id;
  // 6. Admin approves the seller
  const approvedRequest =
    await api.functional.eCommerceMall.administrator.approval_requests.update(
      adminConnection,
      {
        requestId,
        body: {
          status: "approved",
        } satisfies IECommerceMallSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "approval request approved",
    approvedRequest.status,
    "approved",
  );
  // 7. Seller creates a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  TestValidator.equals(
    "product visibility is visible",
    product.visibility,
    "visible",
  );
  // 8. Seller adds a variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  TestValidator.predicate("variant has sku_code", variant.sku_code.length > 0);
  TestValidator.predicate("variant has options", variant.options.length > 0);
  // 9. Seller uploads an image
  const image =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  TestValidator.equals("first image is thumbnail", image.sort_order, 0);
  // 10. Seller retrieves product details
  const retrievedProduct =
    await api.functional.eCommerceMall.seller.products.at(sellerConnection, {
      productId: product.id,
    });
  typia.assert(retrievedProduct);
  // 11. Validate product fields
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "visibility is visible",
    retrievedProduct.visibility,
    "visible",
  );
  TestValidator.predicate(
    "seller has shop_name",
    retrievedProduct.seller.profile.shop_name.length > 0,
  );
  // 12. Validate images
  TestValidator.predicate("has images", retrievedProduct.images.length > 0);
  TestValidator.equals(
    "first image is thumbnail",
    retrievedProduct.images[0].sort_order,
    0,
  );
  for (let i = 1; i < retrievedProduct.images.length; i++) {
    TestValidator.predicate(
      `image[${i}] sort_order > image[${i - 1}] sort_order`,
      retrievedProduct.images[i].sort_order >
        retrievedProduct.images[i - 1].sort_order,
    );
  }
  // 13. Validate variants
  TestValidator.predicate("has variants", retrievedProduct.variants.length > 0);
  for (const v of retrievedProduct.variants) {
    TestValidator.predicate("variant has sku_code", v.sku_code.length > 0);
    TestValidator.predicate("variant has options", v.options.length > 0);
    for (const opt of v.options) {
      TestValidator.predicate("option has key", opt.key.length > 0);
      TestValidator.predicate("option has value", opt.value.length > 0);
    }
    TestValidator.predicate("variant stock >= 0", v.stock >= 0);
  }
  // 14. Validate reviews (should be empty)
  TestValidator.equals("reviews are empty", retrievedProduct.reviews.length, 0);
  TestValidator.equals(
    "average rating is null",
    retrievedProduct.average_rating,
    null,
  );
  TestValidator.equals("review count is 0", retrievedProduct.review_count, 0);
  // 15. Validate timestamps
  TestValidator.predicate(
    "has created_at",
    retrievedProduct.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    retrievedProduct.updated_at.length > 0,
  );
}
