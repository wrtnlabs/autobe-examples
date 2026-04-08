import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_order_history_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Request order list with default pagination
  const orderList = await api.functional.ecommerceMall.member.orders.index(
    memberConnection,
    {
      body: {} satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    orderList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    orderList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    orderList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    orderList.pagination.pages >= 0,
  );
  // 4. Validate orders structure (if any exist)
  if (orderList.data.length > 0) {
    // Verify all orders belong to authenticated member
    const firstOrder = orderList.data[0];
    TestValidator.equals(
      "order belongs to member",
      firstOrder.customer.id,
      memberData.id,
    );
    // Verify order structure
    typia.assert(firstOrder);
    // Verify deleted_at is null (no soft-deleted orders)
    TestValidator.equals("order not soft-deleted", firstOrder.deleted_at, null);
    // Verify order_number format
    TestValidator.predicate(
      "order_number exists",
      firstOrder.order_number.length > 0,
    );
    // Verify total_price is a number
    TestValidator.predicate(
      "total_price is positive number",
      firstOrder.total_price > 0,
    );
    // Verify items_count is non-negative
    TestValidator.predicate(
      "items_count is non-negative",
      firstOrder.items_count >= 0,
    );
    // Verify customer has required fields
    TestValidator.predicate(
      "customer display_name is string or null",
      firstOrder.customer.display_name === null ||
        typeof firstOrder.customer.display_name === "string",
    );
    // Verify shipping_address has required fields
    TestValidator.predicate(
      "shipping_address recipient_name exists",
      firstOrder.shipping_address.recipient_name.length > 0,
    );
    TestValidator.predicate(
      "shipping_address street exists",
      firstOrder.shipping_address.street.length > 0,
    );
    TestValidator.predicate(
      "shipping_address city exists",
      firstOrder.shipping_address.city.length > 0,
    );
    TestValidator.predicate(
      "shipping_address is_default is boolean",
      typeof firstOrder.shipping_address.is_default === "boolean",
    );
  }
  // 5. Verify orders are sorted by created_at descending (if multiple exist)
  if (orderList.data.length > 1) {
    for (let i = 0; i < orderList.data.length - 1; i++) {
      const current = orderList.data[i];
      const next = orderList.data[i + 1];
      TestValidator.predicate(
        `order ${i} is newer than order ${i + 1}`,
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
}