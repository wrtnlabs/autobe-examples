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
export async function test_api_product_image_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection and register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberRegistrationResponse: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      },
    });
  // Store the member email from registration as we know it's part of the actual response
  const memberEmail = memberRegistrationResponse.email;
  // Step 2: Authenticate the member to get a valid session
  const memberAuthConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAuthConnection, {
    body: {
      email: memberEmail,
      password: "12345678",
    },
  });
  // Step 3: Create an admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminConn: api.IConnection = { host: connection.host };
  const adminRegistrationResponse: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConn, {
      body: {
        email: adminEmail,
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      },
    });
  // Step 4: Authenticate the admin to get a valid session
  const adminAuthConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminAuthConnection, {
    body: {
      email: adminEmail,
      password: "12345678",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    },
  });
  // Step 5: Create a product category using the admin connection
  // Generate a UUID for category_id since ICommunityPlatformProductCategory has no id property
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Create the category with a random name (the system will map during product creation)
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminAuthConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        },
      },
    );
  // Step 6: Create a product using the member connection with the generated UUID as category_id
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberAuthConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content(),
          category_id: categoryId, // Use the generated UUID instead of category.id (which doesn't exist)
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(10),
              currency_code: "USD",
              amount: 19.99,
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ],
        },
      },
    );
  // Step 7: Upload an image to the product (as the member)
  // Generate a UUID for the imageId since ICommunityPlatformProductImage has no id property
  const uploadedImageId = typia.random<string & tags.Format<"uuid">>();
  const imageUrl: string = typia.random<string & tags.Format<"uri">>();
  const imageUpload: IPageICommunityPlatformProductImage =
    await generate_random_community_platform_member_products_images_create(
      memberAuthConnection,
      {
        body: {
          productCode: product.productCode,
          name: "Product Image",
          extension: "jpg",
          url: imageUrl,
          is_primary: true,
          alt_text: "Product image",
          order: 0,
        },
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(imageUpload);
  // Step 8: Delete the image as the admin user using the generated UUID as imageId
  await api.functional.communityPlatform.member.products.images.erase(
    adminAuthConnection,
    {
      productCode: product.productCode,
      imageId: uploadedImageId,
    },
  );
  // Step 9: Confirm deletion by trying to delete the same image again - should fail
  await TestValidator.error(
    "should fail to delete already deleted image",
    async () => {
      await api.functional.communityPlatform.member.products.images.erase(
        adminAuthConnection,
        {
          productCode: product.productCode,
          imageId: uploadedImageId,
        },
      );
    },
  );
}
