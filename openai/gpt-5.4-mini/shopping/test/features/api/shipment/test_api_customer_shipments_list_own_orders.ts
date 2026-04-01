import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipments_list_own_orders(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAtDesc",
  } satisfies IMallPlatformShipment.IRequest;
  const page = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current should be positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "shipment list data should be an array",
    Array.isArray(page.data),
  );
  TestValidator.predicate(
    "every shipment summary should include an id",
    page.data.every((shipment) => shipment.id.length > 0),
  );
  TestValidator.predicate(
    "every shipment summary should include a seller summary",
    page.data.every((shipment) => shipment.seller.id.length > 0),
  );
  TestValidator.predicate(
    "every shipment summary should include an order summary",
    page.data.every((shipment) => shipment.order.id.length > 0),
  );
  TestValidator.predicate(
    "every shipment summary should include tracking metadata",
    page.data.every(
      (shipment) =>
        shipment.carrierName.length > 0 && shipment.trackingNumber.length > 0,
    ),
  );
  TestValidator.predicate(
    "every shipment summary should expose lifecycle timestamps",
    page.data.every(
      (shipment) =>
        shipment.createdAt.length > 0 &&
        shipment.updatedAt.length > 0 &&
        (shipment.shippedAt === null || shipment.shippedAt.length > 0) &&
        (shipment.deliveredAt === null || shipment.deliveredAt.length > 0) &&
        shipment.deletedAt === null,
    ),
  );
  const filteredRequest = {
    page: 1,
    limit: 5,
    status: "delivered",
    sort: "shippedAtDesc",
  } satisfies IMallPlatformShipment.IRequest;
  const filteredPage =
    await api.functional.mallPlatform.customer.shipments.index(
      customerConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered shipment list should remain a valid page",
    filteredPage.pagination.current >= 1 && filteredPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "filtered shipment summaries should remain well formed",
    filteredPage.data.every(
      (shipment) =>
        shipment.status.length > 0 &&
        shipment.order.orderNumber.length > 0 &&
        shipment.seller.email.length > 0,
    ),
  );
  const emptyScopeRequest = {
    page: 1,
    limit: 100,
    search: RandomGenerator.alphabets(12),
  } satisfies IMallPlatformShipment.IRequest;
  const emptyPage = await api.functional.mallPlatform.customer.shipments.index(
    customerConnection,
    {
      body: emptyScopeRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.predicate(
    "empty search should still return a valid page structure",
    emptyPage.pagination.current >= 1 && emptyPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "empty search should not return malformed shipment summaries",
    emptyPage.data.every((shipment) => shipment.deletedAt === null),
  );
}
