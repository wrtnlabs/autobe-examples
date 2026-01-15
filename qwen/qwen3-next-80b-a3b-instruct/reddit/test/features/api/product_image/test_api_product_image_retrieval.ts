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
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create product category using admin connection
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active" as const,
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Step 3: Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Generate product code before creating product
  const productCode = RandomGenerator.alphaNumeric(10);
  // Generate product image data for inclusion in product creation
  const productImage: ICommunityPlatformProductImage.ICreate = {
    productCode,
    name: RandomGenerator.name(1),
    extension: "jpg",
    url: typia.random<string & tags.Format<"uri">>(),
    is_primary: true,
    alt_text: RandomGenerator.name(1),
    order: 0,
  };
  // Step 4: Create product using member connection with the generated productCode and image
  // Use a random UUID for category_id since the category creation doesn't return one
  // and the system requires a UUID format for category_id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.name(3),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
          images: [productImage], // Include images array in product creation
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Retrieve product image using productCode and imageId (url as identifier)
  const retrievedImage =
    await api.functional.communityPlatform.products.images.at(
      memberConnection,
      {
        productCode,
        imageId: productImage.url, // Use the image URL as imageId
      },
    );
  typia.assert(retrievedImage);
  // Step 6: Validate retrieved image contains correct metadata
  TestValidator.equals(
    "image URL matches",
    retrievedImage.url,
    productImage.url,
  );
  TestValidator.equals(
    "image alt text matches",
    retrievedImage.alt_text,
    productImage.alt_text,
  );
  TestValidator.equals(
    "image order matches",
    retrievedImage.order,
    productImage.order,
  );
  TestValidator.equals(
    "image is primary matches",
    retrievedImage.is_primary,
    productImage.is_primary,
  );
}
