import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_shipments_search_tracking_consistency_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const first = await api.functional.shoppingMall.admin.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(first);
  const second = await api.functional.shoppingMall.admin.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 2,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "records match",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "pages match",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals("first page current", first.pagination.current, 1);
  TestValidator.equals("second page current", second.pagination.current, 2);
  TestValidator.equals("first page limit", first.pagination.limit, 2);
  TestValidator.equals("second page limit", second.pagination.limit, 2);
  const firstIds = first.data.map((s) => s.id);
  const secondIds = second.data.map((s) => s.id);
  if (first.pagination.records >= 3) {
    const overlap = new Set(secondIds.filter((id) => firstIds.includes(id)));
    TestValidator.equals(
      "no id overlap between page1 and page2",
      overlap.size,
      0,
    );
  }
  const validateItem = (item: IShoppingMallShipment.ISummary) => {
    // Order mapping exists
    TestValidator.predicate(
      "order object exists",
      () => item.order !== undefined,
    );
    TestValidator.predicate("order.id exists", () => item.order.id.length > 0);
    TestValidator.predicate(
      "orderCode exists",
      () => item.order.orderCode.length > 0,
    );
    const anyTracking =
      item.trackingUrl !== null ||
      item.trackingNumber !== null ||
      item.carrierName !== null ||
      item.confirmationType !== null ||
      item.confirmedAt !== null;
    const allConfirmedNull =
      item.trackingUrl === null &&
      item.trackingNumber === null &&
      item.carrierName === null &&
      item.confirmationType === null &&
      item.confirmedAt === null;
    TestValidator.equals(
      "tracking fields move together with confirmation",
      anyTracking,
      !allConfirmedNull,
    );
    if (!allConfirmedNull) {
      TestValidator.predicate(
        "confirmedAt implies all other tracking fields",
        () =>
          item.trackingUrl !== null &&
          item.trackingNumber !== null &&
          item.carrierName !== null &&
          item.confirmationType !== null &&
          item.confirmedAt !== null,
      );
    }
  };
  first.data.forEach(validateItem);
  second.data.forEach(validateItem);
}
