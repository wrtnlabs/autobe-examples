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
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sale_item_update_quantity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for setup operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member connection for primary operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Admin creates product category
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
  // Admin creates product section
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(section);
  // Member creates product
  const productName = RandomGenerator.name(3);
  const productCode = RandomGenerator.alphaNumeric(8);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: productName,
          description: RandomGenerator.content(),
          category_id: (category as any).id as string, // Force use of id from returned object
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [
            {
              productCode: productCode,
              name: "Main Product Image",
              extension: "jpg",
              url: "https://example.com/image.jpg",
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Member creates sale
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    {
      body: {
        product_id: product.id,
        price: product.price,
        currency_code: "USD",
        stock_quantity: 10,
        title: `Sale of ${product.name}`,
        description: "Original sale description",
        section_id: section, // Use section string value as it's of type string
      } satisfies ICommunityPlatformSale.ICreate,
    },
  );
  typia.assert(sale);
  // Since we cannot use index, and itemSku must be known, we assume it's the product's code
  // This is a reasonable default in many systems
  const itemSku = productCode;
  // Update the item quantity
  const updatedItem =
    await api.functional.communityPlatform.member.sales.items.update(
      memberConnection,
      {
        saleCode: sale.id,
        itemSku,
        body: {
          quantity: 5, // update to half the original quantity
        } satisfies ICommunityPlatformSaleItem.IUpdate,
      },
    );
  typia.assert(updatedItem);
  // Validate the update was successful
  TestValidator.equals("updated quantity matches", updatedItem.quantity, 5);
  TestValidator.equals(
    "updated item SKU matches",
    updatedItem.item_sku,
    itemSku,
  );
  TestValidator.equals(
    "updated status is still active",
    updatedItem.status,
    "active",
  );
}
