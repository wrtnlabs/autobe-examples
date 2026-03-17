import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_seller_product_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(adminAuthorized);
  // Step 2: Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuthorized);
  // Verify seller starts with pending status
  TestValidator.equals(
    "seller initial approval status",
    sellerAuthorized.approvalStatus,
    "pending",
  );
  // Step 3: Admin approves the seller registration
  const reviewBody = {
    status: "approved" as const,
    rejection_reason: null,
  } satisfies IEcommerceMallSellerRegistration.IReview;
  const reviewedRegistration =
    await api.functional.ecommerceMall.admin.sellers.registrations.review(
      adminConnection,
      {
        registrationId: sellerAuthorized.id,
        body: reviewBody,
      },
    );
  typia.assert(reviewedRegistration);
  // Step 4: Admin creates a category for product assignment
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // Step 5: Seller logs in again (to get fresh token after approval)
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await authorize_seller_login(
    approvedSellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(approvedSeller);
  // Verify seller now has approved status
  TestValidator.equals(
    "seller approved status after review",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Step 6: Create product with images using the utility function
  const product = await generate_random_ecommerce_mall_seller_products_create(
    approvedSellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32">
        >() satisfies number as number,
        images: ArrayUtil.repeat(
          3,
          () =>
            ({
              imageUrl: typia.random<string & tags.Format<"uri">>(),
            }) satisfies IEcommerceMallProductImage.ICreate,
        ),
      },
    },
  );
  typia.assert(product);
  // Step 7: Verify the created product has expected properties
  TestValidator.predicate("product has valid UUID", () =>
    typia.is<string & tags.Format<"uuid">>(product.id),
  );
  TestValidator.predicate("product has creation timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(product.createdAt),
  );
  TestValidator.predicate("product has update timestamp", () =>
    typia.is<string & tags.Format<"date-time">>(product.updatedAt),
  );
  TestValidator.equals(
    "product seller association",
    product.seller.id,
    approvedSeller.id,
  );
  TestValidator.equals(
    "product category association",
    product.category.id,
    category.id,
  );
  TestValidator.equals("product has images", product.images.length, 3);
  TestValidator.equals("product name is set", product.name.length > 0, true);
  TestValidator.equals(
    "product description is set",
    product.description.length > 0,
    true,
  );
  TestValidator.predicate(
    "product base price is positive",
    () => product.basePrice >= 0,
  );
  TestValidator.equals("product is not deleted", product.deletedAt, null);
  // Step 8: Verify seller info in product matches expected
  TestValidator.equals(
    "product seller email",
    product.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "product seller approval status",
    product.seller.approvalStatus,
    "approved",
  );
}
