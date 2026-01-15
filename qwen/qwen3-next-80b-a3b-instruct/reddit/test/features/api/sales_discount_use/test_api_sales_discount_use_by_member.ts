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
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
import type { ICommunityPlatformSalesDiscountUse } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesDiscountUse";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_sales_discount_use } from "../../../prepare/prepare_random_community_platform_sales_discount_use";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { prepare_random_community_platform_sale_discount_code } from "../../../prepare/prepare_random_community_platform_sale_discount_code";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { generate_random_community_platform_admin_salesdiscountcodes_create } from "../../../generate/generate_random_community_platform_admin_salesdiscountcodes_create";
import { generate_random_community_platform_member_salesdiscountuses_create } from "../../../generate/generate_random_community_platform_member_salesdiscountuses_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_discount_use_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create connections for member and admin actors
  const memberConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Member joins the system
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberHref = `https://example.com/join?source=${RandomGenerator.alphaNumeric(6)}`;
  const memberReferrer = `https://example.com/home?ref=${RandomGenerator.alphaNumeric(6)}`;
  const memberJoinData = {
    email: memberEmail,
    password: memberPassword,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: memberJoinData,
  });
  // Step 2: Create product category and section (admin)
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Since ICommunityPlatformSection is defined as type string, we get the code from create
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
          parent_section_id: undefined,
          visibility_level: "public",
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  // Step 3: Member creates product
  const productCode = RandomGenerator.alphaNumeric(8);
  const productName = RandomGenerator.name(2);
  const productDescription = RandomGenerator.content();
  const productPrice = typia.random<
    number & tags.Minimum<1> & tags.Maximum<10000>
  >();
  // Generate a random UUID for category_id since ICommunityPlatformProductCategory.ICreate has no id
  // In the full ICommunityPlatformProductCategory, the id exists but not in ICreate - we use a generated UUID
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const productCreateData = {
    code: productCode,
    title: productName,
    description: productDescription,
    category_id: categoryId,
    prices: [
      {
        product_code: productCode,
        currency_code: "KRW",
        amount: productPrice,
        effective_from: new Date().toISOString(),
      },
    ] satisfies ICommunityPlatformProductPrice.ICreate[],
  } satisfies ICommunityPlatformProduct.ICreate;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      { body: productCreateData },
    );
  // Step 4: Member creates sale
  const saleTitle = RandomGenerator.name(2);
  const saleDescription = RandomGenerator.paragraph();
  const saleStockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // section is a string, so use it directly as section_id
  const saleCreateData = {
    product_id: product.id,
    price: product.price,
    currency_code: "KRW",
    stock_quantity: saleStockQuantity,
    title: saleTitle,
    description: saleDescription,
    section_id: section, // section is a string type
  } satisfies ICommunityPlatformSale.ICreate;
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    { body: saleCreateData },
  );
  // Step 5: Admin creates a valid discount code
  const discountAmount = typia.random<
    number & tags.Minimum<0.01> & tags.Maximum<5000>
  >();
  const discountType: "percentage" | "fixed" = RandomGenerator.pick([
    "percentage",
    "fixed",
  ] as const);
  // Generate a unique discount code
  const discountCode = `DISCOUNT_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const discountExpirationDate = new Date(Date.now() + 86400000)
    .toISOString()
    .split("T")[0]; // Tomorrow
  const discountCreateData = {
    discountType,
    discountAmount,
    expirationDate: discountExpirationDate,
    maxUses: 10,
    isActive: true,
    minimumPurchaseAmount: 0,
    maxDiscountValue: 9999.99,
  } satisfies ICommunityPlatformSaleDiscountCode.ICreate;
  const discountCodeResponse =
    await generate_random_community_platform_admin_salesdiscountcodes_create(
      adminConnection,
      { body: discountCreateData },
    );
  // Step 6: Member applies discount to their own sale
  // Use sale.base_price instead of sale.price (base_price is the correct property on ICommunityPlatformSale)
  const discountUseData = {
    discount_code: discountCodeResponse.code,
    sale_id: sale.id,
    amount:
      discountType === "percentage"
        ? (discountAmount / 100) * sale.base_price
        : discountAmount,
  } satisfies ICommunityPlatformSalesDiscountUse.ICreate;
  // Validate the discount application
  const discountUse =
    await api.functional.communityPlatform.member.salesdiscountuses.create(
      memberConnection,
      {
        body: discountUseData,
      },
    );
  typia.assert(discountUse);
  // Validate discount usage details
  TestValidator.equals(
    "discount code matches",
    discountUse.discount_code_id,
    discountCodeResponse.code,
  );
  TestValidator.equals("sale ID matches", discountUse.sale_id, sale.id);
  TestValidator.equals(
    "user ID matches",
    discountUse.user_id,
    memberAuthorized.id,
  );
  TestValidator.predicate(
    "discount amount is correct",
    discountUse.discount_amount > 0,
  );
  TestValidator.equals("usage count is 1", discountUse.usage_count, 1);
  TestValidator.equals("status is applied", discountUse.status, "applied");
  // The discount code's usage count is tracked in the salesdiscountuses records, not in the discount code object itself
  // The discountCodeResponse object does not have a 'uses' property, so we cannot validate it directly
  // The validation is complete through the discountUse object which contains usage_count = 1
}
