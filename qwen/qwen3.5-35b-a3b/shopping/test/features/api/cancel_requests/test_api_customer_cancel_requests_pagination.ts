import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_customer_cancel_requests_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection with member token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Test the cancel requests search endpoint
  const result: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.customer.cancel_requests.search(
      authenticatedConnection,
    );
  typia.assert(result);
  // 4. Validate pagination structure exists
  TestValidator.predicate(
    "pagination object exists",
    result.pagination !== undefined,
  );
  // 5. Validate pagination metadata fields
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    result.pagination.pages >= 0,
  );
  // 6. Validate data array exists
  TestValidator.predicate("data is an array", Array.isArray(result.data));
  // 7. Test pagination metadata consistency
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    result.pagination.pages,
    expectedPages,
  );
  // 8. Validate each cancellation request in the data
  for (const request of result.data) {
    // Validate required fields
    TestValidator.predicate("has valid id", request.id !== undefined);
    TestValidator.predicate("has reason", typeof request.reason === "string");
    TestValidator.predicate(
      "has valid status",
      ["pending", "approved", "rejected"].includes(request.status),
    );
    TestValidator.predicate(
      "has created_at",
      typeof request.created_at === "string",
    );
    TestValidator.predicate(
      "has updated_at",
      typeof request.updated_at === "string",
    );
    // Validate item reference
    TestValidator.predicate("has item reference", request.item !== undefined);
    TestValidator.predicate(
      "item has order_number",
      typeof request.item.order_number === "string",
    );
    TestValidator.predicate(
      "item has seller_display_name",
      typeof request.item.seller_display_name === "string",
    );
    TestValidator.predicate(
      "item has product_variant_name",
      typeof request.item.product_variant_name === "string",
    );
    TestValidator.predicate(
      "item has product_variant_sku_code",
      typeof request.item.product_variant_sku_code === "string",
    );
    TestValidator.predicate(
      "item has product_variant_price",
      typeof request.item.product_variant_price === "number",
    );
    TestValidator.predicate(
      "item has quantity",
      typeof request.item.quantity === "number",
    );
    TestValidator.predicate(
      "item has unit_price",
      typeof request.item.unit_price === "number",
    );
    TestValidator.predicate(
      "item has subtotal",
      typeof request.item.subtotal === "number",
    );
    TestValidator.predicate(
      "item has valid status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        request.item.status,
      ),
    );
    TestValidator.predicate(
      "item has created_at",
      typeof request.item.created_at === "string",
    );
    // Validate order reference
    TestValidator.predicate("has order reference", request.order !== undefined);
    TestValidator.predicate(
      "order has id",
      typeof request.order.id === "string",
    );
    TestValidator.predicate(
      "order has order_number",
      typeof request.order.order_number === "string",
    );
    TestValidator.predicate(
      "order has status",
      typeof request.order.status === "string",
    );
    TestValidator.predicate(
      "order has total_price",
      typeof request.order.total_price === "number",
    );
    TestValidator.predicate(
      "order has created_at",
      typeof request.order.created_at === "string",
    );
    TestValidator.predicate(
      "order has items_count",
      typeof request.order.items_count === "number",
    );
    TestValidator.predicate(
      "order has customer reference",
      request.order.customer !== undefined,
    );
    TestValidator.predicate(
      "order has shipping_address reference",
      request.order.shipping_address !== undefined,
    );
    TestValidator.predicate(
      "order has updated_at",
      typeof request.order.updated_at === "string",
    );
    TestValidator.predicate(
      "order has deleted_at",
      request.order.deleted_at === null ||
        typeof request.order.deleted_at === "string",
    );
    // Validate seller reference
    TestValidator.predicate(
      "has seller reference",
      request.seller !== undefined,
    );
    TestValidator.predicate(
      "seller has id",
      typeof request.seller.id === "string",
    );
    TestValidator.predicate(
      "seller has display_name",
      typeof request.seller.display_name === "string",
    );
    TestValidator.predicate(
      "seller has approval_status",
      typeof request.seller.approval_status === "string",
    );
    TestValidator.predicate(
      "seller has is_suspended",
      typeof request.seller.is_suspended === "boolean",
    );
    TestValidator.predicate(
      "seller has created_at",
      typeof request.seller.created_at === "string",
    );
  }
}
