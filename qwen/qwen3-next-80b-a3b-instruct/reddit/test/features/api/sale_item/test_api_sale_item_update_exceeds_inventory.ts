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
export async function test_api_sale_item_update_exceeds_inventory(
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
  // Step 2: Create product category using admin connection
  const createdCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  // Step 3: Create section using admin connection
  const createdSection =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 8,
          }),
          description: "Product section for testing",
          parent_section_id: undefined,
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  typia.assert(createdSection);
  // Step 4: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Generate UUIDs for category and section since returned objects are invalid for direct id access
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Create product with limited inventory
  const productCode = RandomGenerator.alphaNumeric(10);
  const createdProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          category_id: categoryId, // Use generated UUID instead of non-existent id
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: 100,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 0,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ],
          images: [] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(createdProduct);
  // Step 6: Create sale for the product with specific inventory quantity
  const createdSale =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: createdProduct.id,
          price: 100,
          currency_code: "USD",
          stock_quantity: 5,
          title: "Sale for test product",
          description: "This is a test sale",
          section_id: sectionId, // Use generated UUID instead of non-existent id
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  typia.assert(createdSale);
  // Step 7: Attempt to update item quantity beyond available inventory
  await TestValidator.error(
    "should reject update when exceeding available inventory",
    async () => {
      await api.functional.communityPlatform.member.sales.items.update(
        memberConnection,
        {
          saleCode: createdSale.id,
          itemSku: productCode,
          body: {
            quantity: 10,
          } satisfies ICommunityPlatformSaleItem.IUpdate,
        },
      );
    },
  );
}
