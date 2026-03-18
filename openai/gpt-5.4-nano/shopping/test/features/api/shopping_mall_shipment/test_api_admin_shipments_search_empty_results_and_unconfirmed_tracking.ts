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

export async function test_api_admin_shipments_search_empty_results_and_unconfirmed_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2) Empty-result search (non-existent order id)
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const emptySearch =
    await api.functional.shoppingMall.admin.admin.shipments.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
          shopping_mall_order_id: nonExistentOrderId,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "pagination records is 0",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals("data is empty", emptySearch.data.length, 0);
  // 3) Non-empty search (best-effort)
  const search = await api.functional.shoppingMall.admin.admin.shipments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(search);
  TestValidator.predicate("has at least one shipment", search.data.length > 0);
  // 4) Find an unconfirmed shipment (all tracking-derived fields null)
  const unconfirmed = search.data.find(
    (s) =>
      s.trackingUrl === null &&
      s.trackingNumber === null &&
      s.carrierName === null &&
      s.confirmationType === null &&
      s.confirmedAt === null,
  );
  TestValidator.predicate(
    "at least one shipment has unconfirmed tracking fields",
    unconfirmed !== undefined,
  );
  if (unconfirmed) {
    TestValidator.equals("trackingUrl null", unconfirmed.trackingUrl, null);
    TestValidator.equals(
      "trackingNumber null",
      unconfirmed.trackingNumber,
      null,
    );
    TestValidator.equals("carrierName null", unconfirmed.carrierName, null);
    TestValidator.equals(
      "confirmationType null",
      unconfirmed.confirmationType,
      null,
    );
    TestValidator.equals("confirmedAt null", unconfirmed.confirmedAt, null);
    // Non-confirmation fields should still be present
    TestValidator.predicate(
      "shipment status present",
      unconfirmed.status.length > 0,
    );
    TestValidator.predicate(
      "order summary present",
      unconfirmed.order.orderCode.length > 0,
    );
  }
}
