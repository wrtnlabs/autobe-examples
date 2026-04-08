import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_order_items_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a shipment with order items
  const shipment =
    await generate_random_ecommerce_mall_super_admin_shipments_create(
      superAdminConnection,
      {},
    );
  typia.assert(shipment);
  // 3. Retrieve order items from the shipment with pagination
  const paginationRequest = {
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const response =
    await api.functional.ecommerceMall.superAdmin.shipments.items.index(
      superAdminConnection,
      {
        shipmentId: shipment.id,
        body: paginationRequest,
      },
    );
  typia.assert(response);
  // 4. Validate business logic - pagination parameters are correctly applied
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  // 5. Validate business logic - if there are shipment items, verify data consistency
  if (shipment.shipment_items.length > 0 && response.data.length > 0) {
    // Verify that returned order item IDs match the shipment's order items
    const shipmentOrderItemIds = new Set(
      shipment.shipment_items.map((si) => si.orderItem.id),
    );
    const responseOrderItemIds = new Set(response.data.map((item) => item.id));
    TestValidator.predicate(
      "all returned items belong to the shipment",
      response.data.every((item) => shipmentOrderItemIds.has(item.id)),
    );
    TestValidator.equals(
      "total records matches shipment items count",
      response.pagination.records,
      shipment.shipment_items.length,
    );
    // Verify data has correct references
    const sampleItem = response.data[0]!;
    TestValidator.predicate(
      "item has valid seller reference from shipment",
      sampleItem.seller.id === shipment.seller.id,
    );
  }
}
