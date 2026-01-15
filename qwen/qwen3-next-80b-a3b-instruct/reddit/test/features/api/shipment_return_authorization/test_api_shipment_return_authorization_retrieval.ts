import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { ICommunityPlatformProductPrice } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductPrice";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import type { ICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentReturnAuthorization";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_return_authorization } from "../../../prepare/prepare_random_community_platform_shipment_return_authorization";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_member_shipments_return_authorizations_create } from "../../../generate/generate_random_community_platform_member_shipments_return_authorizations_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_return_authorization_retrieval(
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
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Create a synthetic UUID for category_id since category doesn't return id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Register an inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 8,
          }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          country: "US",
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 10000,
          delivery_capabilities: ["standard", "express"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/create-supplier",
          referrer: "https://example.com/dashboard",
          postal_code: RandomGenerator.alphaNumeric(5), // Changed from undefined to 5-digit US ZIP code
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create a product - First create the product with base properties first (without prices)
  const createdProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          category_id: categoryId,
          prices: [], // Start with empty prices array
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(createdProduct);
  // Now we have productCode from the created product
  const productCode = createdProduct.productCode; // Correct property name
  // Re-create product with prices array using the actual product code
  const finalProduct =
    await generate_random_community_platform_member_products_create(
      adminConnection,
      {
        body: {
          code: createdProduct.productCode, // Fixed: using productCode instead of code
          title: createdProduct.name,
          description: createdProduct.description,
          category_id: createdProduct.category_id,
          prices: [
            {
              product_code: productCode, // Use the correct productCode from the product response
              currency_code: "USD",
              amount: 99.99,
              effective_from: new Date().toISOString(),
              effective_to: null,
              quantity_min: 1,
              quantity_max: null,
              notes: "Standard retail price",
              source: "ManualEntry",
              region: undefined,
              price_type: "retail",
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(finalProduct);
  const product = finalProduct;
  // Step 5: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 6: Create a shipment for the product using member connection
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Deliver with signature",
          packages: [
            {
              shipment_id: "", // Will be filled later, server should handle it
              product_id: product.id,
              quantity: 1,
              weight_grams: 500,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(), // Changed from "not-applicable" to real UUID
              insurance_value_usd: 100,
              special_instructions: "Fragile, handle with care",
            },
          ],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: true,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Create a return authorization for the shipment - Include shipmentId in body
  const returnAuthorization =
    await generate_random_community_platform_member_shipments_return_authorizations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          shipmentId: shipment.id, // Explicitly include shipmentId in body as required by ICreate
          reason: "damaged",
          comments: "Product arrived with damaged packaging",
        } satisfies ICommunityPlatformShipmentReturnAuthorization.ICreate,
      },
    );
  typia.assert(returnAuthorization);
  // Step 8: Retrieve the return authorization as the member
  const retrievedAuthorization =
    await api.functional.communityPlatform.member.shipments.return_authorizations.at(
      memberConnection,
      {
        shipmentId: shipment.id,
        authorizationId: returnAuthorization.id,
      },
    );
  typia.assert(retrievedAuthorization);
  // Step 9: Validate the retrieved return authorization
  TestValidator.equals(
    "return authorization ID matches",
    retrievedAuthorization.id,
    returnAuthorization.id,
  );
  TestValidator.equals(
    "return authorization status matches",
    retrievedAuthorization.status,
    returnAuthorization.status,
  );
  TestValidator.equals(
    "return reason matches",
    retrievedAuthorization.return_reason,
    returnAuthorization.return_reason,
  );
  TestValidator.predicate(
    "refund amount is greater than 0",
    retrievedAuthorization.refund_amount > 0,
  );
  TestValidator.equals(
    "return items count matches",
    retrievedAuthorization.return_items_count,
    returnAuthorization.return_items_count,
  );
  TestValidator.equals(
    "return date is set",
    retrievedAuthorization.return_date,
    returnAuthorization.return_date,
  );
}
