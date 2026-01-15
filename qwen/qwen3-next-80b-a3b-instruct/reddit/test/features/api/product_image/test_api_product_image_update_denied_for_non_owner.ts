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
// Local extended interfaces to add the missing 'id' property
interface ICommunityPlatformProductCategoryWithId extends ICommunityPlatformProductCategory {
  id: string;
}
interface ICommunityPlatformProductImageWithId extends ICommunityPlatformProductImage {
  id: string;
}
export async function test_api_product_image_update_denied_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create a product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Cast to extended interface to access id property
  const categoryWithId = category as ICommunityPlatformProductCategoryWithId;
  // Step 3: Create member1 connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 4: Create a unique product code for the product
  const productCode = RandomGenerator.alphaNumeric(8);
  // Step 5: Member1 creates a product with the product code
  const product =
    await generate_random_community_platform_member_products_create(
      member1Connection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: categoryWithId.id, // Now we can safely access id
          prices: [
            {
              product_code: productCode,
              currency_code: "KRW",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Member1 uploads an image to the product
  const uploadResult =
    await generate_random_community_platform_member_products_images_create(
      member1Connection,
      {
        params: {
          productCode: product.productCode,
        },
        body: {
          productCode: product.productCode,
          name: "Product Image",
          extension: "jpg",
          url: typia.random<string & tags.Format<"uri">>(),
          is_primary: true,
          alt_text: "Product main image",
          order: 0,
        } satisfies ICommunityPlatformProductImage.ICreate,
      },
    );
  typia.assert(uploadResult);
  const image = uploadResult.data[0];
  typia.assert(image);
  // Cast to extended interface to access id property
  const imageWithId = image as ICommunityPlatformProductImageWithId;
  // Step 7: Create member2 connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 8: Member2 attempts to update the image owned by member1 (should be denied)
  await TestValidator.error(
    "non-owner member should be denied product image update",
    async () => {
      await api.functional.communityPlatform.member.products.images.update(
        member2Connection,
        {
          productCode: product.productCode,
          imageId: imageWithId.id, // Now we can safely access id
          body: {
            url: typia.random<string & tags.Format<"uri">>(),
            alt_text: "Updated alt text",
            is_primary: false,
            order: 1,
          } satisfies ICommunityPlatformProductImage.IUpdate,
        },
      );
    },
  );
}
