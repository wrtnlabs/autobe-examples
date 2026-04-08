import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // First, submit admin request
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // Login with the admin credentials
  const authorizedAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_login(adminConnection, {
      body: {
        email: "admin@test.com",
        password: "1234",
        href: "https://example.com/admin",
        referrer: "https://example.com",
      },
    });
  // Create a new connection with admin authorization
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // Call admin order listing endpoint with default pagination
  const response: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.admin.orders.index(
      authenticatedConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  // Validate response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20",
    response.pagination.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records count non-negative",
    response.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    response.pagination.pagination.pages >= 0,
  );
  // Validate orders are sorted by created_at descending (newest first)
  for (let i = 1; i < response.data.length; i++) {
    const current = new Date(response.data[i].created_at).getTime();
    const previous = new Date(response.data[i - 1].created_at).getTime();
    TestValidator.predicate(
      `order at index ${i} should have earlier or equal created_at than order at index ${i - 1}`,
      current <= previous,
    );
  }
  // Validate each order summary contains required fields
  for (const order of response.data) {
    TestValidator.predicate(
      "order_number exists and is non-empty",
      order.order_number.length > 0,
    );
    TestValidator.predicate(
      "total_amount is non-negative",
      order.total_amount >= 0,
    );
    TestValidator.predicate(
      "status is valid",
      [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "partially_completed",
      ].includes(order.status),
    );
    TestValidator.predicate(
      "customer reference exists",
      order.customer.id.length > 0,
    );
    TestValidator.predicate(
      "shipping_address exists",
      order.shipping_address.id.length > 0,
    );
    TestValidator.predicate(
      "items_count is non-negative",
      order.items_count >= 0,
    );
  }
}
