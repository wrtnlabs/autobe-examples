import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_variant } from "../../../prepare/prepare_random_community_platform_product_variant";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_member_products_variants_create } from "../../../generate/generate_random_community_platform_member_products_variants_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_products_prices_create } from "../../../generate/generate_random_community_platform_member_products_prices_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_cart_update_with_new_items(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Log in as admin to create category
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: "dummy-password",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 3: Create a product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminLoginConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parent_id: null,
          status: "active",
        },
      },
    );
  typia.assert(category);
  // Step 4: Create member connection and authenticate
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      password: memberPassword,
    },
  });
  typia.assert(member);
  // Step 5: Log in as member to create product
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  // Step 6: Create product with the category
  // Generate a UUID for the category_id since the actual ID from category object isn't available
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_community_platform_member_products_create(
      memberLoginConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          // Use generated UUID for category_id
          category_id: categoryId,
          prices: [
            {
              product_code: "", // We'll set this after product creation
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(product);
  // Step 7: Create price for the product using productCode
  const price =
    await generate_random_community_platform_member_products_prices_create(
      memberLoginConnection,
      {
        body: {
          product_code: product.productCode,
          currency_code: "USD",
          amount: 200,
          effective_from: new Date().toISOString(),
        },
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(price);
  // Step 8: Create product variant for the product
  const variant =
    await generate_random_community_platform_member_products_variants_create(
      memberLoginConnection,
      {
        body: {
          product_id: product.id,
          variant_name: "Variant 1",
          price: 200,
          stock_quantity: 100,
          is_active: true,
          attributes: [
            {
              key: "color",
              value: "red",
            },
          ],
        },
        params: {
          productCode: product.productCode,
        },
      },
    );
  typia.assert(variant);
  // Step 9: Update cart with one item of quantity 1 - this should succeed
  // Use member.id as cartId
  const cartId = member.id;
  // Ensure we have a cart by creating one
  const updatedCart =
    await api.functional.communityPlatform.member.carts.update(
      memberLoginConnection,
      {
        cartId,
        body: {
          items: [
            {
              quantity: 1,
            },
          ],
        },
      },
    );
  typia.assert(updatedCart);
  // Step 10: Attempt to update cart with quantity 0 - this should fail due to validation
  await TestValidator.error(
    "cart update with quantity 0 should fail",
    async () => {
      await api.functional.communityPlatform.member.carts.update(
        memberLoginConnection,
        {
          cartId,
          body: {
            items: [
              {
                quantity: 0,
              },
            ],
          },
        },
      );
    },
  );
}
