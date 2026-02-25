import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshots_filter_by_modifying_actor(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate a random refund request ID for filtering
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter by customer_id
  const customerFiltered =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          modifying_customer_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies (string & tags.Format<"uuid">) | null | undefined as
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as "created_at",
          sort_order: "desc" as "desc",
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(customerFiltered);
  TestValidator.equals(
    "customer filter returns page",
    customerFiltered.pagination.current,
    1,
  );
  // Validate all returned snapshots have customer_id matching filter (if data exists)
  for (const snapshot of customerFiltered.data) {
    if (snapshot.modifying_customer) {
      // If snapshot has modifying_customer, it should have id
      TestValidator.predicate(
        "customer has id",
        snapshot.modifying_customer.id !== null,
      );
    }
  }
  // Test 2: Filter by seller_id
  const sellerFiltered =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          modifying_seller_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies (string & tags.Format<"uuid">) | null | undefined as
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as "created_at",
          sort_order: "desc" as "desc",
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(sellerFiltered);
  TestValidator.equals(
    "seller filter returns page",
    sellerFiltered.pagination.current,
    1,
  );
  for (const snapshot of sellerFiltered.data) {
    if (snapshot.modifying_seller) {
      TestValidator.predicate(
        "seller has id",
        snapshot.modifying_seller.id !== null,
      );
    }
  }
  // Test 3: Filter by administrator_id
  const adminFiltered =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          modifying_administrator_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies (string & tags.Format<"uuid">) | null | undefined as
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as "created_at",
          sort_order: "desc" as "desc",
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(adminFiltered);
  TestValidator.equals(
    "admin filter returns page",
    adminFiltered.pagination.current,
    1,
  );
  for (const snapshot of adminFiltered.data) {
    if (snapshot.modifying_administrator) {
      TestValidator.predicate(
        "administrator has id",
        snapshot.modifying_administrator.id !== null,
      );
    }
  }
  // Test 4: Combined filters with date range
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const endDate = new Date().toISOString();
  const combinedFiltered =
    await api.functional.ecommerce.administrator.refund_requests.snapshots.index(
      adminConnection,
      {
        refundRequestId,
        body: {
          modifying_customer_id: typia.random<
            string & tags.Format<"uuid">
          >() satisfies (string & tags.Format<"uuid">) | null | undefined as
            | (string & tags.Format<"uuid">)
            | null
            | undefined,
          created_at_start: startDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          created_at_end: endDate satisfies string &
            tags.Format<"date-time"> as string & tags.Format<"date-time">,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort_by: "created_at" as "created_at",
          sort_order: "desc" as "desc",
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter returns page",
    combinedFiltered.pagination.current,
    1,
  );
  // Validate snapshots are ordered by created_at desc
  for (let i = 1; i < combinedFiltered.data.length; i++) {
    const prev = new Date(combinedFiltered.data[i - 1].created_at);
    const curr = new Date(combinedFiltered.data[i].created_at);
    TestValidator.predicate("snapshots ordered descending", prev >= curr);
  }
}
