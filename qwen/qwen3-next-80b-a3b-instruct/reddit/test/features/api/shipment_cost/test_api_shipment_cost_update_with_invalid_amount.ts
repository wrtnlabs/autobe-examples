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
export async function test_api_shipment_cost_update_with_invalid_amount(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host } satisfies IConnection as IConnection;
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.IJoin>()
  });
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.ILogin>()
  });
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host } satisfies IConnection as IConnection;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>()
  });
  const memberLoginResult = await authorize_member_login(memberConnection, {
    body: typia.random<ICommunityPlatformMember.ILogin>()
  });
  // Step 3: Create product category
  const category =
    await generate_random_community_platform_admin_categories_create(
      adminConnection,
      {
        body: typia.random<ICommunityPlatformProductCategory.ICreate>()
      },
    );
  // Step 4: Create inventory supplier
  const supplier =
    await generate_random_community_platform_admin_inventory_suppliers_create(
      adminConnection,
      {
        body: typia.random<ICommunityPlatformInventorySuppliers.ICreate>()
      },
    );
  // Step 5: Create product using member connection
  const productCode = RandomGenerator.alphaNumeric(10);
  const product =
    await generate_random_community_platform_member_products_create(
      memberConnection,
      {
        body: typia.random<ICommunityPlatformProduct.ICreate>()
      },
    );
  // Step 6: Create shipment using member connection
  const shipment = await generate_random_community_platform_member_shipments_create(
    memberConnection,
    {
      body: typia.random<ICommunityPlatformShipment.ICreate>()
    },
  );
  // Step 7: Create initial cost entry on shipment using admin connection
  const cost =
    await generate_random_community_platform_admin_shipments_costs_create(
      adminConnection,
      {
        body: typia.random<ICommunityPlatformShipmentCost.ICreate>(),
        params: {
          shipmentId: typia.assert(shipment).id
        },
      },
    );
  // Step 8: Attempt update with negative amount value - should throw error
  await TestValidator.error("should reject negative amount", async () => {
    await api.functional.communityPlatform.admin.shipments.costs.update(
      adminConnection,
      {
        shipmentId: typia.assert(shipment).id,
        costId: typia.assert(cost).id,
        body: {
          amount: -10, // Negative amount violates business rule (amount >= 0)
        } satisfies ICommunityPlatformShipmentCost.IUpdate as ICommunityPlatformShipmentCost.IUpdate,
      },
    );
  });
}