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
export async function test_api_shipment_return_authorization_retrieval_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Admin connection now has auth token in headers
  // Step 2: Create product category
  const category: ICommunityPlatformProductCategory =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          parent_id: null,
          status: "active",
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  typia.assert(category);
  // Since ICommunityPlatformProductCategory doesn't technically have 'id', but product creation requires a UUID category_id,
  // we ASSERT the actual response includes an id field based on API behavior
  const categoryWithId: ICommunityPlatformProductCategory & {
    id: string & tags.Format<"uuid">;
  } = typia.assert<
    ICommunityPlatformProductCategory & {
      id: string & tags.Format<"uuid">;
    }
  >(category);
  // Step 3: Create inventory supplier
  const supplier: ICommunityPlatformInventorySuppliers =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          contact_email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          supplier_type: "manufacturer",
          address_line_1: RandomGenerator.paragraph(),
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
          href: "https://example.com/admin/suppliers/new",
          referrer: "https://example.com",
          postal_code: typia.random<
            string & tags.Pattern<"^[0-9]{5}(?:-[0-9]{4})?$">
          >(),
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  typia.assert(supplier);
  // Step 4: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Member connection now has auth token in headers
  // Step 5: Member creates a product using the category and supplier
  const product: ICommunityPlatformProduct =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryWithId.id, // Use the inferred ID from our typia.assert
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: typia.random<number & tags.Minimum<0>>(),
              effective_from: new Date().toISOString(),
              effective_to: null,
            } satisfies ICommunityPlatformProductPrice.ICreate,
          ] satisfies ICommunityPlatformProductPrice.ICreate[],
          images: [
            {
              productCode: RandomGenerator.alphaNumeric(8),
              name: RandomGenerator.name(),
              extension: "jpg",
              url: "https://example.com/image.jpg",
              is_primary: true,
              alt_text: "Product image",
              order: 0,
            } satisfies ICommunityPlatformProductImage.ICreate,
          ] satisfies ICommunityPlatformProductImage.ICreate[],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 6: Member creates a shipment for the product
  const shipment: ICommunityPlatformShipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Special handling instructions",
          packages: [
            {
              shipment_id: typia.random<string & tags.Format<"uuid">>(),
              product_id: product.id,
              quantity: 1,
              weight_grams: 1000,
              tracking_number: RandomGenerator.alphaNumeric(16),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: 100,
              special_instructions: "Fragile",
            } satisfies ICommunityPlatformShipmentPackage.ICreate,
          ] satisfies ICommunityPlatformShipmentPackage.ICreate[],
          shipment_type: "standard",
          exception_handling: "hold",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 7: Member creates a return authorization for the shipment
  const returnAuthorization: ICommunityPlatformShipmentReturnAuthorization =
    await generate_random_community_platform_member_shipments_return_authorizations_create(
      memberConnection,
      {
        body: {
          shipmentId: shipment.id,
          reason: "damaged",
          comments: "Item arrived with damage",
        } satisfies ICommunityPlatformShipmentReturnAuthorization.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  typia.assert(returnAuthorization);
  // Step 8: Admin retrieves the return authorization
  const retrievedReturnAuthorization: ICommunityPlatformShipmentReturnAuthorization =
    await api.functional.communityPlatform.member.shipments.return_authorizations.at(
      adminConnection,
      {
        shipmentId: shipment.id,
        authorizationId: returnAuthorization.id,
      },
    );
  typia.assert(retrievedReturnAuthorization);
  // Step 9: Validate that admin can access the return authorization
  TestValidator.equals(
    "return authorization id matches",
    retrievedReturnAuthorization.id,
    returnAuthorization.id,
  );
  TestValidator.equals(
    "return authorization status matches",
    retrievedReturnAuthorization.status,
    returnAuthorization.status,
  );
  TestValidator.equals(
    "return authorization reason matches",
    retrievedReturnAuthorization.return_reason,
    returnAuthorization.return_reason,
  );
  TestValidator.equals(
    "return authorization code matches",
    retrievedReturnAuthorization.return_code,
    returnAuthorization.return_code,
  );
  TestValidator.equals(
    "return authorization items count matches",
    retrievedReturnAuthorization.return_items_count,
    returnAuthorization.return_items_count,
  );
  TestValidator.equals(
    "return authorization weight matches",
    retrievedReturnAuthorization.total_return_weight,
    returnAuthorization.total_return_weight,
  );
  TestValidator.equals(
    "return authorization carrier id matches",
    retrievedReturnAuthorization.return_carrier_id,
    returnAuthorization.return_carrier_id,
  );
  TestValidator.equals(
    "return authorization date matches",
    retrievedReturnAuthorization.return_date,
    returnAuthorization.return_date,
  );
  TestValidator.equals(
    "return authorization address id matches",
    retrievedReturnAuthorization.return_address_id,
    returnAuthorization.return_address_id,
  );
  TestValidator.equals(
    "return authorization refund amount matches",
    retrievedReturnAuthorization.refund_amount,
    returnAuthorization.refund_amount,
  );
}
