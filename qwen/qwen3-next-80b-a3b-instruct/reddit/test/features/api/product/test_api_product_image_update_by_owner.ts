import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductImage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_images_create } from "../../../generate/generate_random_community_platform_member_products_images_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a product category as admin
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Assuming category has an internal id property even if not in ICommunityPlatformProductCategory
  // The ICommunityPlatformProduct.ICreate requires a category_id of uuid format
  // So we cast the category to have an id property for the purpose of this test
  const categoryId = (category as any).id as string & tags.Format<"uuid">;
  // Step 3: Create member connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      password: RandomGenerator.alphaNumeric(16), // Added required password property
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create a product as member
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Extract the productCode from the created product
  const productCode: string = product.productCode;
  // Step 5: Upload an initial image to the product
  const imageUpload =
    await generate_random_community_platform_member_products_images_create(
      memberConnection,
      {
        params: {
          productCode,
        },
        body: {
          productCode,
          name: RandomGenerator.name(),
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
          is_primary: true,
          alt_text: "Initial product image",
          order: 0,
        } satisfies ICommunityPlatformProductImage.ICreate,
      },
    );
  typia.assert(imageUpload);
  const uploadedImage = imageUpload.data[0];
  // Assuming the returned ICommunityPlatformProductImage object has an id property
  // even if not in the interface definition, because the update endpoint requires it
  const imageId = (uploadedImage as any).id as string & tags.Format<"uuid">;
  // Step 6: Update the product image as product owner (member)
  const updatedImage =
    await api.functional.communityPlatform.member.products.images.update(
      memberConnection,
      {
        productCode,
        imageId: imageId,
        body: {
          url: uploadedImage.url,
          alt_text: "Updated product image description",
          is_primary: true,
          order: 1,
        } satisfies ICommunityPlatformProductImage.IUpdate,
      },
    );
  typia.assert(updatedImage);
  // Step 7: Validate the update was successful
  TestValidator.equals(
    "updated image alt text",
    updatedImage.alt_text,
    "Updated product image description",
  );
  TestValidator.equals("updated image order", updatedImage.order, 1);
  TestValidator.equals(
    "updated image is primary",
    updatedImage.is_primary,
    true,
  );
  TestValidator.equals(
    "updated image url",
    updatedImage.url,
    uploadedImage.url,
  );
}
