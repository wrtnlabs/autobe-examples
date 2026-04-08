import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_history_pagination_newest_first(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate customer order item snapshot history pagination with newest-first ordering.
   *
   * This test verifies that an authenticated customer can browse preserved order item snapshot history
   * and that the returned page metadata is internally consistent with the snapshot list. It also checks
   * that the server preserves newest-first ordering across the returned snapshot history.
   *
   * 1. Register and authenticate a customer account using an isolated connection.
   * 2. Request the customer's order item snapshot history.
   * 3. Validate pagination metadata and newest-first ordering.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const history =
    await api.functional.mallPlatform.customer.orderItemSnapshots.history(
      customerConnection,
    );
  typia.assert(history);
  const pagination = history.pagination;
  TestValidator.predicate(
    "page number is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("page limit is non-negative", pagination.limit >= 0);
  TestValidator.predicate(
    "record count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("page count is non-negative", pagination.pages >= 0);
  const expectedPages =
    pagination.limit > 0 ? Math.ceil(pagination.records / pagination.limit) : 0;
  TestValidator.equals(
    "pagination pages match records and limit",
    pagination.pages,
    expectedPages,
  );
  TestValidator.predicate(
    "returned data does not exceed page limit",
    history.data.length <= pagination.limit || pagination.limit === 0,
  );
  TestValidator.predicate(
    "record count covers returned data",
    pagination.records >= history.data.length,
  );
  if (history.data.length > 1) {
    for (let i = 1; i < history.data.length; ++i) {
      const previous = history.data[i - 1];
      const current = history.data[i];
      TestValidator.predicate(
        "history is newest-first by snapshot time",
        previous.snapshotAt >= current.snapshotAt,
      );
    }
  }
}
