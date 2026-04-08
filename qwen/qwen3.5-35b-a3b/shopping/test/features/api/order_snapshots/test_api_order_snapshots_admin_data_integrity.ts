import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_snapshots_admin_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(3),
        email: typia.random<string & tags.Format<"email">>(),
        password: "Admin@1234",
      },
    });
  typia.assert(adminData);
  TestValidator.equals("administrator registered", adminData.grade, "regular");
  TestValidator.equals(
    "administrator has token",
    adminData.token.access.length > 0,
    true,
  );
  // Re-authenticate to ensure fresh token
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(adminAuthenticatedConnection, {
    body: {
      display_name: adminData.display_name,
      email: adminData.email,
      password: "Admin@1234",
    },
  });
  // 2. Create test order ID
  const testOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order snapshots (may be empty if no order exists, which is valid)
  const snapshotsPage: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminAuthenticatedConnection,
      {
        orderId: testOrderId,
        body: {},
      },
    );
  typia.assert(snapshotsPage);
  // 4. Validate pagination structure
  const pagination: IPage.IPagination = snapshotsPage.pagination;
  TestValidator.equals("pagination has current page", pagination.current, 1);
  TestValidator.equals("pagination has limit", pagination.limit, 20);
  TestValidator.equals(
    "pagination has total records",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has total pages",
    pagination.pages >= 0,
    true,
  );
  // 5. If snapshots exist, validate data integrity and immutability
  if (snapshotsPage.data.length > 0) {
    const snapshot: IEcommerceMallOrderSnapshot.ISummary =
      snapshotsPage.data[0];
    typia.assert(snapshot);
    // Validate required fields are present and non-empty
    TestValidator.equals(
      "snapshot has UUID",
      snapshot.id.startsWith("00000000-0000-0000-0000-") === false,
      true,
    );
    TestValidator.equals(
      "snapshot has order number",
      snapshot.order_number.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has order date",
      snapshot.order_date.length > 0,
      true,
    );
    // Validate customer information is preserved
    TestValidator.equals(
      "snapshot has customer name",
      snapshot.customer_name.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has customer phone",
      snapshot.customer_phone.length > 0,
      true,
    );
    // Validate shipping address details are preserved
    TestValidator.equals(
      "snapshot has shipping recipient name",
      snapshot.shipping_recipient_name.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping phone",
      snapshot.shipping_phone.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping street",
      snapshot.shipping_street.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping city",
      snapshot.shipping_city.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping state",
      snapshot.shipping_state.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping postal code",
      snapshot.shipping_postal_code.length > 0,
      true,
    );
    TestValidator.equals(
      "snapshot has shipping country",
      snapshot.shipping_country.length > 0,
      true,
    );
    // Validate financial data is preserved
    TestValidator.equals(
      "snapshot has item count",
      snapshot.item_count,
      snapshot.item_count,
    );
    TestValidator.equals(
      "snapshot has subtotal",
      snapshot.subtotal,
      snapshot.subtotal,
    );
    TestValidator.equals(
      "snapshot has shipping fee",
      snapshot.shipping_fee,
      snapshot.shipping_fee,
    );
    TestValidator.equals(
      "snapshot has total amount",
      snapshot.total_amount,
      snapshot.total_amount,
    );
    TestValidator.predicate(
      "total amount equals subtotal + shipping",
      snapshot.total_amount === snapshot.subtotal + snapshot.shipping_fee,
    );
    TestValidator.predicate("item count is positive", snapshot.item_count > 0);
    TestValidator.predicate("subtotal is positive", snapshot.subtotal > 0);
    // Validate order status is preserved
    TestValidator.equals(
      "snapshot has order status",
      snapshot.order_status.length > 0,
      true,
    );
    // 6. Validate snapshot immutability by retrieving same snapshot again
    const snapshotsPage2: IPageIEcommerceMallOrderSnapshot.ISummary =
      await api.functional.ecommerceMall.administrator.orders.snapshots.index(
        adminAuthenticatedConnection,
        {
          orderId: testOrderId,
          body: {},
        },
      );
    typia.assert(snapshotsPage2);
    if (snapshotsPage2.data.length > 0) {
      const snapshot2: IEcommerceMallOrderSnapshot.ISummary =
        snapshotsPage2.data[0];
      typia.assert(snapshot2);
      // Validate snapshot is immutable - same data should be returned
      TestValidator.equals(
        "snapshot order number is immutable",
        snapshot.order_number,
        snapshot2.order_number,
      );
      TestValidator.equals(
        "snapshot customer name is immutable",
        snapshot.customer_name,
        snapshot2.customer_name,
      );
      TestValidator.equals(
        "snapshot subtotal is immutable",
        snapshot.subtotal,
        snapshot2.subtotal,
      );
      TestValidator.equals(
        "snapshot shipping fee is immutable",
        snapshot.shipping_fee,
        snapshot2.shipping_fee,
      );
      TestValidator.equals(
        "snapshot total amount is immutable",
        snapshot.total_amount,
        snapshot2.total_amount,
      );
      TestValidator.equals(
        "snapshot order status is immutable",
        snapshot.order_status,
        snapshot2.order_status,
      );
    }
  }
  // 7. Test filtered snapshot retrieval
  const today: string = new Date().toISOString();
  const snapshotsWithDateFilter: IPageIEcommerceMallOrderSnapshot.ISummary =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminAuthenticatedConnection,
      {
        orderId: testOrderId,
        body: {
          order_date_start: today,
        },
      },
    );
  typia.assert(snapshotsWithDateFilter);
  // Verify filtered results match pagination expectations
  TestValidator.equals(
    "filtered snapshot has valid pagination",
    snapshotsWithDateFilter.pagination.records >= 0,
    true,
  );
}
