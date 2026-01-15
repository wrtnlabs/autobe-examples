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
export async function test_api_return_authorization_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Admin creates a product category
  const categoryResponse =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          status: "active",
          parent_id: null,
        } satisfies ICommunityPlatformProductCategory.ICreate,
      },
    );
  // Since ICommunityPlatformProductCategory does not have an 'id' property, generate a valid UUID for category_id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Admin registers an inventory supplier
  const supplier =
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
          postal_code: typia
            .random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<10000> &
                tags.Maximum<99999>
            >()
            .toString(),
          website: "https://example.com",
          payment_terms: "Net 30",
          credit_limit: 100000,
          delivery_capabilities: ["standard"],
          compliance_certifications: ["iso9001"],
          account_manager_name: RandomGenerator.name(),
          account_manager_email: typia.random<string & tags.Format<"email">>(),
          account_manager_phone: RandomGenerator.mobile(),
          bank_account_details: "123456789",
          password: RandomGenerator.alphaNumeric(16),
          href: "https://example.com/join",
          referrer: "https://example.com",
        } satisfies ICommunityPlatformInventorySuppliers.ICreate,
      },
    );
  // Step 5: Member creates a product (not admin)
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.name(),
          description: RandomGenerator.content(),
          category_id: categoryId,
          prices: [
            {
              product_code: RandomGenerator.alphaNumeric(8),
              currency_code: "USD",
              amount: Math.round(Math.random() * 1000),
              effective_from: new Date().toISOString(),
              effective_to: null,
            },
          ],
        } satisfies ICommunityPlatformProduct.ICreate,
      },
    );
  // Step 6: Member creates a shipment with package
  // We must include shipment_id in package and provide special_instructions
  // Generate a dummy shipment_id for the package since we don't have the shipment yet
  const dummyShipmentId = typia.random<string & tags.Format<"uuid">>();
  const shipmentResponse =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          packages: [
            {
              shipment_id: dummyShipmentId, // Use dummy shipment_id (will be overridden by system)
              product_id: product.id,
              quantity: 1,
              weight_grams: 1000,
              tracking_number: RandomGenerator.alphaNumeric(12),
              carrier_id: typia.random<string & tags.Format<"uuid">>(),
              insurance_value_usd: product.price,
              special_instructions: "", // Required field, empty string satisfies
            },
          ],
          shipment_type: "standard",
          signature_required: false,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // The actual shipment ID from the response will be used for return authorization
  const shipmentId = shipmentResponse.id;
  // Step 7: Member creates a return authorization
  const returnAuthorization =
    await generate_random_community_platform_member_shipments_return_authorizations_create(
      memberConnection,
      {
        body: {
          shipmentId: shipmentId,
          reason: "damaged",
          comments: "Item arrived with damaged packaging",
        } satisfies ICommunityPlatformShipmentReturnAuthorization.ICreate,
        params: {
          shipmentId: shipmentId,
        },
      },
    );
  // Step 8: Admin retrieves the return authorization
  const retrieved =
    await api.functional.communityPlatform.admin.shipments.return_authorizations.at(
      adminConnection,
      {
        shipmentId: shipmentId,
        authorizationId: returnAuthorization.id,
      },
    );
  typia.assert(retrieved);
  // Validate retrieval
  TestValidator.equals(
    "return authorization status matches",
    retrieved.status,
    returnAuthorization.status,
  );
  TestValidator.equals(
    "return reason matches",
    retrieved.return_reason,
    returnAuthorization.return_reason,
  );
  TestValidator.equals(
    "refund amount matches",
    retrieved.refund_amount,
    returnAuthorization.refund_amount,
  );
  TestValidator.equals(
    "return code matches",
    retrieved.return_code,
    returnAuthorization.return_code,
  );
  TestValidator.equals(
    "return items count matches",
    retrieved.return_items_count,
    returnAuthorization.return_items_count,
  );
  TestValidator.equals(
    "total return weight matches",
    retrieved.total_return_weight,
    returnAuthorization.total_return_weight,
  );
  TestValidator.equals(
    "return date matches",
    retrieved.return_date,
    returnAuthorization.return_date,
  );
}
