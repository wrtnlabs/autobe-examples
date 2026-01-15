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
import type { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
import type { ICommunityPlatformShipmentDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentDimensions";
import type { ICommunityPlatformShipmentPackage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentPackage";
import { prepare_random_community_platform_product_image } from "../../../prepare/prepare_random_community_platform_product_image";
import { prepare_random_community_platform_product_category } from "../../../prepare/prepare_random_community_platform_product_category";
import { prepare_random_community_platform_product_price } from "../../../prepare/prepare_random_community_platform_product_price";
import { prepare_random_community_platform_product } from "../../../prepare/prepare_random_community_platform_product";
import { prepare_random_community_platform_shipment } from "../../../prepare/prepare_random_community_platform_shipment";
import { prepare_random_community_platform_shipment_cost } from "../../../prepare/prepare_random_community_platform_shipment_cost";
import { prepare_random_community_platform_shipment_package } from "../../../prepare/prepare_random_community_platform_shipment_package";
import { prepare_random_community_platform_inventory_suppliers } from "../../../prepare/prepare_random_community_platform_inventory_suppliers";
import { generate_random_community_platform_member_products_create } from "../../../generate/generate_random_community_platform_member_products_create";
import { generate_random_community_platform_admin_categories_create } from "../../../generate/generate_random_community_platform_admin_categories_create";
import { generate_random_community_platform_member_shipments_create } from "../../../generate/generate_random_community_platform_member_shipments_create";
import { generate_random_community_platform_admin_shipments_costs_create } from "../../../generate/generate_random_community_platform_admin_shipments_costs_create";
import { generate_random_community_platform_admin_inventory_suppliers_create } from "../../../generate/generate_random_community_platform_admin_inventory_suppliers_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_shipment_cost_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Create member connection and authenticate as member using join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 3: Authenticate as member using login with captured credentials
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  // Step 4: Create a shipment with package data
  const packageData: ICommunityPlatformShipmentPackage.ICreate[] = [
    {
      shipment_id: "shipmentId-placeholder",
      product_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1,
      weight_grams: 500,
      tracking_number: RandomGenerator.alphaNumeric(15),
      carrier_id: typia.random<string & tags.Format<"uuid">>(),
      insurance_value_usd: 100,
      special_instructions: "Fragile items",
    },
  ];
  const shipment =
    await generate_random_community_platform_member_shipments_create(
      memberConnection,
      {
        body: {
          notes: "Handle with care",
          packages: packageData,
          shipment_type: "standard" as const,
        } satisfies ICommunityPlatformShipment.ICreate,
      },
    );
  // Step 5: Create shipment cost by admin
  const cost =
    await generate_random_community_platform_admin_shipments_costs_create(
      adminConnection,
      {
        body: {
          cost_type: "carrier_fee",
          amount: 15.99,
          currency: "USD",
          description: "Base shipping fee",
        } satisfies ICommunityPlatformShipmentCost.ICreate,
        params: {
          shipmentId: shipment.id,
        },
      },
    );
  // Step 6: Update shipment cost by admin
  const updatedCost =
    await api.functional.communityPlatform.admin.shipments.costs.update(
      adminConnection,
      {
        shipmentId: shipment.id,
        costId: cost.id,
        body: {
          amount: 25.99,
          currency: "USD",
          description: "Updated shipping fee",
        } satisfies ICommunityPlatformShipmentCost.IUpdate,
      },
    );
  typia.assert(updatedCost);
  // Validate that cost was updated correctly
  TestValidator.equals("updated cost amount", updatedCost.amount, 25.99);
  TestValidator.equals("updated cost currency", updatedCost.currency, "USD");
  TestValidator.equals(
    "updated cost description",
    updatedCost.description,
    "Updated shipping fee",
  );
}
