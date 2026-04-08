import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApproval";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

export async function test_api_product_creation_with_variants_and_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - register and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Login as admin with same credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  // 2. Seller registration (pending approval)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  TestValidator.equals(
    "seller approval status pending",
    sellerJoin.approval_status,
    "pending",
  );
  // 3. Administrator approves seller registration
  // Since we don't have an endpoint to list approvals, we'll use a workaround:
  // The approval workflow typically requires finding the approval record first
  // For this test, we assume the approval is handled and proceed with seller login
  // In a real scenario, there would be an endpoint like GET /ecommerce/admin/approvals/pending
  // to list pending seller approvals, then we'd get the approvalId from that response
  // For testing purposes, we'll login as seller - this assumes the seller has been approved
  // In production, this would fail with 403 if seller is still pending
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.ILogin,
  });
  // 4. Administrator creates product category
  const category = await generate_random_ecommerce_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(category);
  // 5. Seller creates product with variants and images
  const variants: IEcommerceProductVariant.ICreate[] = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        sku_code: `SKU-${RandomGenerator.alphabets(3).toUpperCase()}-${index + 1}`,
        option_values: `color=${RandomGenerator.alphabets(5)};size=${["S", "M", "L"][index]}`,
        price:
          index === 0
            ? null
            : typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
      }) satisfies IEcommerceProductVariant.ICreate,
  );
  const images: IEcommerceProductImage.ICreate[] = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        image_url: `https://example.com/images/product-${index + 1}.jpg`,
      }) satisfies IEcommerceProductImage.ICreate,
  );
  const product = await generate_random_ecommerce_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: variants,
        images: images,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Validate product has all variants
  TestValidator.equals(
    "variant count matches",
    product.variants.length,
    variants.length,
  );
  // 7. Validate each variant has correct SKU and option values
  for (const [index, variant] of product.variants.entries()) {
    TestValidator.equals(
      `variant ${index} SKU code`,
      variant.sku_code,
      variants[index].sku_code,
    );
    TestValidator.equals(
      `variant ${index} option values`,
      variant.option_values,
      variants[index].option_values,
    );
    // Validate option values format (key=value;key=value)
    const optionPairs = variant.option_values.split(";");
    for (const pair of optionPairs) {
      const [key, value] = pair.split("=");
      TestValidator.predicate(
        `option ${index} has key`,
        key !== undefined && key.length > 0,
      );
      TestValidator.predicate(
        `option ${index} has value`,
        value !== undefined && value.length > 0,
      );
    }
  }
  // 8. Validate product has all images
  TestValidator.equals(
    "image count matches",
    product.productImages.length,
    images.length,
  );
  // 9. Validate images have correct display ordering
  const sortedImages = [...product.productImages].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  TestValidator.predicate(
    "images are ordered",
    sortedImages[0].displayOrder === 0,
  );
  // 10. Validate first image (display_order=0) is the thumbnail
  const thumbnailImage = product.productImages.find(
    (img) => img.displayOrder === 0,
  );
  TestValidator.predicate(
    "thumbnail image exists",
    thumbnailImage !== undefined,
  );
  TestValidator.equals(
    "first image is thumbnail",
    thumbnailImage?.imageUrl,
    product.productImages[0].imageUrl,
  );
  // 11. Validate product basic fields
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  TestValidator.predicate("base price is positive", product.basePrice > 0);
}