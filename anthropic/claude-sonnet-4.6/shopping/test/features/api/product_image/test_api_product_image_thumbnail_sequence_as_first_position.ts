import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_image_thumbnail_sequence_as_first_position(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // 6. Seller creates a product with the created category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Seller uploads 3 images in a single batch
  const imageBundle =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          urls: [
            typia.random<string & tags.Format<"url">>(),
            typia.random<string & tags.Format<"url">>(),
            typia.random<string & tags.Format<"url">>(),
          ],
        },
      },
    );
  typia.assert(imageBundle);
  // 8. The images array is ordered by ascending sequence
  const images = imageBundle.images;
  TestValidator.predicate("at least 3 images uploaded", images.length >= 3);
  // The first image in the array has the lowest sequence — this is the thumbnail
  const thumbnailImage = images[0]!;
  const nonFirstImage = images[1]!;
  // 9. Retrieve the thumbnail image publicly (no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedThumbnail =
    await api.functional.shoppingMall.products.images.at(publicConnection, {
      productId: product.id,
      imageId: thumbnailImage.id,
    });
  typia.assert(retrievedThumbnail);
  // 10. Verify the thumbnail has the lowest sequence value
  TestValidator.equals(
    "thumbnail sequence matches first image",
    retrievedThumbnail.sequence,
    thumbnailImage.sequence,
  );
  // Verify thumbnail has lower sequence than all other images
  for (const img of images.slice(1)) {
    TestValidator.predicate(
      "thumbnail sequence is lowest",
      retrievedThumbnail.sequence < img.sequence,
    );
  }
  // 11. Retrieve a non-first image publicly
  const retrievedNonFirst =
    await api.functional.shoppingMall.products.images.at(publicConnection, {
      productId: product.id,
      imageId: nonFirstImage.id,
    });
  typia.assert(retrievedNonFirst);
  // 12. Verify the non-first image has a strictly greater sequence than the thumbnail
  TestValidator.predicate(
    "non-first image sequence is greater than thumbnail",
    retrievedNonFirst.sequence > retrievedThumbnail.sequence,
  );
  // 13. Verify both images belong to the correct product
  TestValidator.equals(
    "thumbnail product id matches",
    retrievedThumbnail.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "non-first image product id matches",
    retrievedNonFirst.shopping_mall_product_id,
    product.id,
  );
}
