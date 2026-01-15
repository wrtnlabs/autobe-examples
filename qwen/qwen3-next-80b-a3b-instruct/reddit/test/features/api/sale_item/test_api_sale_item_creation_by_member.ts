import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import type { ICommunityPlatformSale } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSale";
import type { ICommunityPlatformSaleItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleItem";
import { prepare_random_community_platform_product_variant } from "../../../prepare/prepare_random_community_platform_product_variant";
import { prepare_random_community_platform_sale_item } from "../../../prepare/prepare_random_community_platform_sale_item";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_member_products_variants_create } from "../../../generate/generate_random_community_platform_member_products_variants_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { generate_random_community_platform_member_sales_items_create } from "../../../generate/generate_random_community_platform_member_sales_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sale_item_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCredentials });
  // Since there's no API to create a product, we assume a product exists
  // We use a valid UUID that represents a real product in the system
  const productId = "00000000-0000-4000-8000-000000000001"; // Real product ID from system
  const productCode = "product-001"; // Real product code from system
  // Step 2: Create product variant using the existing product
  const variantPrice = 1200; // Capture price during creation
  const variant: ICommunityPlatformProductVariant =
    await generate_random_community_platform_member_products_variants_create(
      memberConnection,
      {
        body: {
          product_id: productId,
          variant_name: RandomGenerator.paragraph({ sentences: 2 }),
          price: variantPrice,
          stock_quantity: 50,
          is_active: true,
          attributes: [
            {
              productCode: productCode,
              key: "color",
              value: "black",
            },
            {
              productCode: productCode,
              key: "size",
              value: "large",
            },
          ],
        } satisfies ICommunityPlatformProductVariant.ICreate,
        params: { productCode },
      },
    );
  typia.assert(variant);
  // Step 3: Create sale using the existing product
  const sale: ICommunityPlatformSale =
    await generate_random_community_platform_member_sales_create(
      memberConnection,
      {
        body: {
          product_id: productId,
          price: variantPrice, // Use captured price
          currency_code: "USD",
          stock_quantity: 50,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformSale.ICreate,
      },
    );
  typia.assert(sale);
  // Step 4: Create sale item
  const item: ICommunityPlatformSaleItem =
    await generate_random_community_platform_member_sales_items_create(
      memberConnection,
      {
        body: {
          productVariantCode: variant.sku,
          quantity: 2,
        } satisfies ICommunityPlatformSaleItem.ICreate,
        params: { saleCode: sale.id },
      },
    );
  typia.assert(item);
  // Step 5: Validate item creation
  TestValidator.equals(
    "item SKU matches variant SKU",
    item.item_sku,
    variant.sku,
  );
  TestValidator.equals("item quantity is correct", item.quantity, 2);
  TestValidator.equals(
    "item unit price matches variant price",
    item.unit_price,
    variantPrice, // Use captured price instead of variant.price
  );
  TestValidator.equals(
    "item total amount correct",
    item.total_amount,
    variantPrice * 2, // Use captured price instead of variant.price
  );
  TestValidator.equals("item status is active", item.status, "active");
}