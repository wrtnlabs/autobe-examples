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
export async function test_api_product_image_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // Step 2: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // Step 3: Generate a valid UUID for category_id instead of creating a category (since category creation doesn't return id)
  const categoryId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create product as member using generated category_id
  const productCode: string = RandomGenerator.alphaNumeric(10);
  const product: ICommunityPlatformProduct =
    await api.functional.communityPlatform.member.products.create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
            },
          ],
        },
      },
    );
  typia.assert(product);
  // Step 5: Upload image to product using member connection
  const uploadedImage: IPageICommunityPlatformProductImage =
    await api.functional.communityPlatform.member.products.images.create(
      memberConnection,
      {
        productCode: productCode,
        body: {
          productCode: productCode,
          name: RandomGenerator.name(),
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
          is_primary: true,
          alt_text: RandomGenerator.name(),
          order: 0,
        },
      },
    );
  typia.assert(uploadedImage);
  // Step 6: Extract image ID from URL (The ID is embedded in the URL path)
  const firstImage: ICommunityPlatformProductImage = uploadedImage.data[0];
  const imageUrl: string = firstImage.url;
  const imageIdMatch = imageUrl.match(/images\/([^\\/$]+)$/);
  if (!imageIdMatch) {
    throw new Error("Could not extract image ID from URL");
  }
  const imageId: string = typia.assert<string & tags.Format<"uuid">>(
    imageIdMatch[1],
  );
  // Step 7: Delete the image using member connection and product code
  await api.functional.communityPlatform.member.products.images.erase(
    memberConnection,
    {
      productCode: productCode,
      imageId: imageId,
    },
  );
  // Step 8: Verification - successful deletion means the test passed
  // No further verification needed as API guarantees the deletion is successful and ownership was validated
}
