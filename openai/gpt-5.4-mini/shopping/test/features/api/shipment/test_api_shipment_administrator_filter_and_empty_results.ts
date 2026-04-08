import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_shipment_administrator_filter_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Abcd1234!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const assertPage = (
    title: string,
    page: IPageIMallPlatformShipment.ISummary,
  ): void => {
    TestValidator.predicate(
      `${title} current is positive`,
      page.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${title} limit is positive`,
      page.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `${title} records is non-negative`,
      page.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${title} pages is non-negative`,
      page.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${title} data length does not exceed limit`,
      page.data.length <= page.pagination.limit,
    );
  };
  const broad = await api.functional.mallPlatform.administrator.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(broad);
  assertPage("broad page", broad);
  if (broad.data.length > 0) {
    const sample = RandomGenerator.pick(broad.data);
    const byCarrier =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            carrierName: sample.carrierName,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(byCarrier);
    assertPage("carrier-filtered page", byCarrier);
    TestValidator.predicate(
      "carrier filter only returns matching shipments",
      byCarrier.data.every(
        (shipment) => shipment.carrierName === sample.carrierName,
      ),
    );
    const byTracking =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            trackingNumber: sample.trackingNumber,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(byTracking);
    assertPage("tracking-filtered page", byTracking);
    TestValidator.predicate(
      "tracking filter only returns matching shipments",
      byTracking.data.every(
        (shipment) => shipment.trackingNumber === sample.trackingNumber,
      ),
    );
    const byStatus =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            status: sample.status,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(byStatus);
    assertPage("status-filtered page", byStatus);
    TestValidator.predicate(
      "status filter only returns matching shipments",
      byStatus.data.every((shipment) => shipment.status === sample.status),
    );
    const bySeller =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            sellerId: sample.seller.id,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(bySeller);
    assertPage("seller-filtered page", bySeller);
    TestValidator.predicate(
      "seller filter only returns matching shipments",
      bySeller.data.every(
        (shipment) => shipment.seller.id === sample.seller.id,
      ),
    );
    const byCustomer =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            customerId: sample.order.customer.id,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(byCustomer);
    assertPage("customer-filtered page", byCustomer);
    TestValidator.predicate(
      "customer filter only returns matching shipments",
      byCustomer.data.every(
        (shipment) => shipment.order.customer.id === sample.order.customer.id,
      ),
    );
    const byCreatedRange =
      await api.functional.mallPlatform.administrator.shipments.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
            createdAtFrom: sample.createdAt,
            createdAtTo: sample.createdAt,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(byCreatedRange);
    assertPage("createdAt-filtered page", byCreatedRange);
    TestValidator.predicate(
      "createdAt range filter only returns matching shipments",
      byCreatedRange.data.every(
        (shipment) =>
          shipment.createdAt >= sample.createdAt &&
          shipment.createdAt <= sample.createdAt,
      ),
    );
  }
  const empty = await api.functional.mallPlatform.administrator.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        carrierName: `no-such-carrier-${RandomGenerator.alphabets(12)}`,
        trackingNumber: `NO-SUCH-${RandomGenerator.alphaNumeric(12)}`,
      } satisfies IMallPlatformShipment.IRequest,
    },
  );
  typia.assert(empty);
  assertPage("empty page", empty);
  TestValidator.equals("empty page data length", empty.data.length, 0);
  TestValidator.equals("empty page records", empty.pagination.records, 0);
  TestValidator.equals("empty page pages", empty.pagination.pages, 0);
  TestValidator.equals("empty page current", empty.pagination.current, 1);
}
