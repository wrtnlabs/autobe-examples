import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_shipment_admin_list_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test default pagination (page 1, limit 20)
  const firstPage =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("default limit is 20", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate records equals 0 when pages equals 0
  if (firstPage.pagination.pages === 0) {
    TestValidator.equals(
      "no records when no pages",
      firstPage.pagination.records,
      0,
    );
  }
  // 3. Test with custom page size (limit 10)
  const smallPage =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals(
    "small page limit is 10",
    smallPage.pagination.limit,
    10,
  );
  // 4. Test with maximum page size (limit 100)
  const maxPage =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(maxPage);
  TestValidator.equals("max page limit is 100", maxPage.pagination.limit, 100);
  // 5. Test with page number beyond available data (should return empty data)
  const emptyPage =
    await api.functional.ecommerceMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 20,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
  // 6. Validate shipment summary structure when data exists
  if (firstPage.data.length > 0) {
    const shipment = firstPage.data[0];
    // Validate required fields exist
    TestValidator.predicate(
      "carrier is non-empty string",
      typeof shipment.carrier === "string" && shipment.carrier.length > 0,
    );
    TestValidator.predicate(
      "tracking_number is non-empty string",
      typeof shipment.tracking_number === "string" &&
        shipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "item_count is non-negative",
      shipment.item_count >= 0,
    );
    // Validate order reference
    TestValidator.predicate(
      "order exists",
      shipment.order !== undefined && shipment.order !== null,
    );
    TestValidator.predicate(
      "order_number is non-empty string",
      typeof shipment.order?.order_number === "string" &&
        shipment.order.order_number.length > 0,
    );
    // Validate seller reference
    TestValidator.predicate(
      "seller exists",
      shipment.seller !== undefined && shipment.seller !== null,
    );
    TestValidator.predicate(
      "seller has id",
      typeof shipment.seller?.id === "string",
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at is valid datetime",
      typeof shipment.created_at === "string" && shipment.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is valid datetime",
      typeof shipment.updated_at === "string" && shipment.updated_at.length > 0,
    );
    // Validate pages calculation (Math.ceil(records / limit))
    if (firstPage.pagination.records > 0) {
      const expectedPages = Math.ceil(
        firstPage.pagination.records / firstPage.pagination.limit,
      );
      TestValidator.equals(
        "pages matches records/limit calculation",
        firstPage.pagination.pages,
        expectedPages,
      );
    }
  }
}
