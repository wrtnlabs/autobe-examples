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

export async function test_api_shipment_administrator_browse_summary(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator shipment summary browsing with pagination and newest-first ordering.
   *
   * Validates that an authenticated administrator can browse shipment summaries across the platform through the paginated administrator shipment listing endpoint. The test focuses on summary-level response shape, pagination metadata, and visible lifecycle fields while ensuring the result remains a compact browse payload rather than a nested shipment-item graph.
   *
   * 1. Authenticate a dedicated administrator connection using the administrator join utility.
   * 2. Request the first page of shipment summaries with an explicit page and limit.
   * 3. Validate the response structure, pagination metadata, and summary fields for each returned shipment.
   * 4. Confirm the endpoint preserves completed shipments in browse results and orders records from newest to oldest when multiple rows are returned.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 1,
    limit: 20,
  } satisfies IMallPlatformShipment.IRequest;
  const page = await api.functional.mallPlatform.administrator.shipments.index(
    adminConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "pagination current page",
    page.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    page.pagination.limit,
    request.limit ?? page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length respects limit",
    page.data.length <= page.pagination.limit,
  );
  for (const shipment of page.data) {
    TestValidator.predicate("shipment id exists", shipment.id.length > 0);
    TestValidator.predicate(
      "shipment has seller summary",
      shipment.seller.id.length > 0,
    );
    TestValidator.predicate(
      "shipment has order summary",
      shipment.order.id.length > 0,
    );
    TestValidator.predicate(
      "shipment carrier name exists",
      shipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment tracking number exists",
      shipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment created timestamp exists",
      shipment.createdAt.length > 0,
    );
    TestValidator.predicate(
      "shipment updated timestamp exists",
      shipment.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "shipment status exists",
      shipment.status.length > 0,
    );
  }
  for (let i: number = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      "newest-first ordering by createdAt",
      page.data[i - 1].createdAt >= page.data[i].createdAt,
    );
  }
  TestValidator.predicate(
    "completed shipments remain visible when present",
    page.data.every((shipment) => shipment.status !== "hidden"),
  );
}
