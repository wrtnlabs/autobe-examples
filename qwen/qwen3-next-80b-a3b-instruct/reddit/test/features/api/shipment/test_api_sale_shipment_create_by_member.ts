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
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_section } from "../../../prepare/prepare_random_community_platform_section";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_sale } from "../../../prepare/prepare_random_community_platform_sale";
import { generate_random_community_platform_admin_sections_create } from "../../../generate/generate_random_community_platform_admin_sections_create";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_sales_create } from "../../../generate/generate_random_community_platform_member_sales_create";
import { generate_random_community_platform_member_sales_shipments_create } from "../../../generate/generate_random_community_platform_member_sales_shipments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sale_shipment_create_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Collect email value from the successful join
  const adminLoginEmail: string = typia.random<string & tags.Format<"email">>();
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminLoginEmail,
      password: "adminpassword123",
      href: "https://example.com/login", // Added missing href property
      referrer: "https://example.com/home", // Added missing referrer property
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Step 2: Create product category and section
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
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
  // Extract section details before object construction
  const sectionName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const sectionDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const sectionVisibilityLevel: ICommunityPlatformSection.ICreate["visibility_level"] =
    "public";
  // Handle parent_section_id as required by type, ensuring it's string & Format<"uuid"> | undefined
  const parentSectionId: (string & tags.Format<"uuid">) | undefined = undefined;
  const section =
    await generate_random_community_platform_admin_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: sectionDescription,
          parent_section_id: parentSectionId,
          visibility_level: sectionVisibilityLevel,
        } satisfies ICommunityPlatformSection.ICreate,
      },
    );
  // Step 3: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Extract email value before object construction
  const memberLoginEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  await authorize_member_login(memberConnection, {
    body: {
      email: memberLoginEmail,
      password: "memberpassword123",
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 4: Create product
  const productCode = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9-_.]{1,50}$">
  >();
  // Extract category id from category response body
  const categoryId = typia.assert<{
    id: string;
  }>(category).id;
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 7,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          category_id: categoryId,
          prices: [
            {
              product_code: productCode,
              currency_code: "USD",
              amount: typia.random<
                number & tags.Minimum<0> & tags.Maximum<1000>
              >(),
              effective_from: new Date().toISOString(),
              quantity_min: 1,
            },
          ] satisfies ICommunityPlatformProduct.ICreate["prices"],
          images: [],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 5: Create sale
  // Extract product id from product response body
  const productId = product.id;
  // Extract section id from section response body
  const sectionId = typia.assert<{
    id: string;
  }>(section).id;
  const sale = await generate_random_community_platform_member_sales_create(
    memberConnection,
    {
      body: {
        product_id: productId,
        price: product.price,
        currency_code: "USD",
        stock_quantity: 10,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: sectionId,
      } satisfies ICommunityPlatformSale.ICreate,
    },
  );
  // Step 6: Create shipment with address information
  const saleCode = sale.id; // Correct property name from ICommunityPlatformSale - the sale identifier is 'id'
  // Create new shipment and get generated shipment_id
  const createdShipment =
    await generate_random_community_platform_member_sales_shipments_create(
      memberConnection,
      {
        params: {
          saleCode: saleCode,
        },
        body: {
          notes: "Handle with care",
          packages: [
            {
              // Add shipment_id property which is required in ICommunityPlatformShipmentPackage.ICreate
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: productId,
              quantity: 1,
              weight_grams: 500,
              tracking_number: typia.random<
                string & tags.MinLength<1> & tags.MaxLength<50>
              >(),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Do not stack",
            },
          ] satisfies ICommunityPlatformShipment.ICreate["packages"],
          shipment_type: "standard",
          exception_handling: "redeliver",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 7: Validate shipment
  typia.assert(createdShipment);
  TestValidator.equals(
    "shipment status should be pending",
    createdShipment.status,
    "pending",
  );
  TestValidator.predicate(
    "tracking number should exist",
    createdShipment.trackingNumber.length > 0,
  );
  TestValidator.equals(
    "shipment should be linked to correct sale",
    createdShipment.saleCode,
    sale.id,
  );
  TestValidator.equals(
    "created at should exist",
    !!createdShipment.createdAt,
    true,
  );
  TestValidator.equals(
    "shipment type should be standard",
    createdShipment.shippingMethod,
    "standard",
  );
}
