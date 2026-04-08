import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_shipments_create } from "../../../generate/generate_random_ecommerce_mall_admin_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_admin_shipment_items_list_paginated(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Create a shipment with items to have shipmentId for testing
  const shipment: IEcommerceMallShipment =
    await generate_random_ecommerce_mall_admin_shipments_create(
      adminConnection,
      {
        body: {
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
          carrierName: "FedEx",
          trackingNumber: RandomGenerator.alphaNumeric(20).toUpperCase(),
        },
      },
    );
  typia.assert(shipment);
  // Test 1: Retrieve shipment items with default pagination
  const defaultPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(defaultPage);
  // Validate pagination structure
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  TestValidator.equals("default limit is 20", defaultPage.pagination.limit, 20);
  TestValidator.predicate(
    "pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  // Test 2: Retrieve shipment items with custom pagination
  const customPageRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const customPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: customPageRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals(
    "custom page limit matches",
    customPage.pagination.limit,
    10,
  );
  // Test 3: Filter by status
  const statusFilterRequest = {
    status: "shipped",
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const statusFiltered: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: statusFilterRequest,
      },
    );
  typia.assert(statusFiltered);
  // Test 4: Pagination with maximum limit boundary
  const boundaryRequest = {
    page: 1,
    limit: 100,
  } satisfies IEcommerceMallOrderItem.IRequest;
  const boundaryPage: IPageIEcommerceMallOrderItem.ISummary =
    await api.functional.ecommerceMall.admin.shipments.items.index(
      adminConnection,
      {
        shipmentId: shipment.id,
        body: boundaryRequest,
      },
    );
  typia.assert(boundaryPage);
  TestValidator.equals(
    "boundary limit matches",
    boundaryPage.pagination.limit,
    100,
  );
}
