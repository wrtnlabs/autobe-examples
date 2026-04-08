import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_sequential_upload_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      actorType: "seller" as const,
      requestedGrade: "admin" as const,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
        import("typia").tags.Format<"uri">,
      referrer:
        `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
          import("typia").tags.Format<"uri">,
    },
  });
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.random<string & import("typia").tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        import("typia").tags.Format<"password">,
      href: `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
        import("typia").tags.Format<"uri">,
      referrer:
        `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
          import("typia").tags.Format<"uri">,
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {},
  );
  // 2. Seller joins and logs in
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<
    string & import("typia").tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string &
        import("typia").tags.Format<"password">,
      href: `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
        import("typia").tags.Format<"uri">,
      referrer:
        `https://test.example.com/${RandomGenerator.alphabets(8)}` as string &
          import("typia").tags.Format<"uri">,
    },
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword as string &
        import("typia").tags.Format<"password">,
    },
  });
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  // 4. Upload first image (should have display_order=0, becomes thumbnail)
  const firstImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(firstImage);
  TestValidator.equals("first image display_order", firstImage.displayOrder, 0);
  // 5. Upload second image (should have display_order=1)
  const secondImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(secondImage);
  TestValidator.equals(
    "second image display_order",
    secondImage.displayOrder,
    1,
  );
  // 6. Upload third image (should have display_order=2)
  const thirdImage =
    await generate_random_ecommerce_mall_seller_products_images_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(thirdImage);
  TestValidator.equals("third image display_order", thirdImage.displayOrder, 2);
  // 7. Validate third image is NOT the thumbnail (display_order > 0)
  TestValidator.predicate(
    "third image is not thumbnail",
    thirdImage.displayOrder > 0,
  );
  TestValidator.predicate(
    "third image display_order is 2",
    thirdImage.displayOrder === 2,
  );
  // 8. Validate sequential order is correct
  TestValidator.predicate(
    "first image before second",
    firstImage.displayOrder < secondImage.displayOrder,
  );
  TestValidator.predicate(
    "second image before third",
    secondImage.displayOrder < thirdImage.displayOrder,
  );
}
