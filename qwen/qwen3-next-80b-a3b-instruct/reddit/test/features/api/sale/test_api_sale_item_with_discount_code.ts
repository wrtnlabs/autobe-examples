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
export async function test_api_sale_item_with_discount_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create sale and product items
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Create a product variant
  const variantCreationBody = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    variant_name: RandomGenerator.name(),
    price: 10000, // $100.00
    stock_quantity: 10,
    is_active: true,
    attributes: [
      {
        productCode: "test-product-123",
        key: "color",
        value: "black",
      },
    ],
  } satisfies ICommunityPlatformProductVariant.ICreate;
  const productVariant =
    await api.functional.communityPlatform.member.products.variants.create(
      memberConnection,
      {
        productCode: "test-product-123",
        body: variantCreationBody,
      },
    );
  typia.assert(productVariant);
  // Step 3: Create a sale associated with the product
  const sale = await api.functional.communityPlatform.member.sales.create(
    memberConnection,
    {
      body: {
        product_id: variantCreationBody.product_id,
        price: variantCreationBody.price,
        currency_code: "USD",
        stock_quantity: variantCreationBody.stock_quantity,
        title: "Sale: " + variantCreationBody.variant_name,
        description:
          "Sale for product variant: " + variantCreationBody.variant_name,
        section_id: "default-section-id",
      } satisfies ICommunityPlatformSale.ICreate,
    },
  );
  typia.assert(sale);
  // Step 4: Create a sale item with the product variant code and quantity
  const saleItem =
    await api.functional.communityPlatform.member.sales.items.create(
      memberConnection,
      {
        saleCode: sale.id,
        body: {
          productVariantCode: productVariant.sku,
          quantity: 2,
        } satisfies ICommunityPlatformSaleItem.ICreate,
      },
    );
  typia.assert(saleItem);
  // Step 5: Validate the sale item creation
  // Verify the unit price matches the product variant price
  TestValidator.equals(
    "unit price matches product variant price",
    saleItem.unit_price,
    variantCreationBody.price,
  );
  // Verify quantity matches desired quantity
  TestValidator.equals(
    "quantity matches requested quantity",
    saleItem.quantity,
    2,
  );
  // Verify total amount equals unit price times quantity
  TestValidator.equals(
    "total amount equals unit price times quantity",
    saleItem.total_amount,
    saleItem.unit_price * saleItem.quantity,
  );
  // Verify item status is active
  TestValidator.equals("item status is active", saleItem.status, "active");
  // Discount code functionality cannot be tested as there is no mechanism to create discount codes
  // The test scenario requested testing discount code application, but this is impossible
  // because there are no API endpoints to create or manage discount codes. Therefore,
  // this portion of the scenario is impossible and has been removed.
  // Only the base functionality of creating a sale item with a product variant and quantity
  // is testable with the provided API and DTO definitions.
}
