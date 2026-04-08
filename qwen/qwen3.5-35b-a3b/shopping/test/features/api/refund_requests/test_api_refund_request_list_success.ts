import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_refund_request_list_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer member
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  // 2. Call refund requests list endpoint with default pagination
  const listResponse =
    await api.functional.ecommerceMall.member.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(listResponse);
  // 3. Validate response structure
  typia.assert<IPageIEcommerceMallRefundRequest.ISummary>(listResponse);
  // 4. Validate pagination metadata
  const pagination = listResponse.pagination;
  TestValidator.predicate("pagination exists", pagination !== undefined);
  TestValidator.predicate(
    "pagination.current is valid",
    pagination.current >= 0 && pagination.current <= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    pagination.limit >= 1 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  // 5. Verify pages calculation is correct
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    pagination.pages,
    expectedPages,
  );
  // 6. Validate refund request summaries in data array
  const data = listResponse.data;
  if (data.length > 0) {
    TestValidator.predicate(
      "at least one refund request in data",
      data.length > 0,
    );
    // Validate each refund request in the list
    for (let i = 0; i < data.length; i++) {
      const refundRequest = data[i];
      const item = refundRequest.item;
      const approvedBySeller = refundRequest.approvedBySeller;
      const rejectedBySeller = refundRequest.rejectedBySeller;
      // Validate refund request id
      typia.assert<string & tags.Format<"uuid">>(refundRequest.id);
      // Validate status field
      typia.assert<string>(refundRequest.status);
      const validStatuses = ["pending", "approved", "rejected"] as const;
      TestValidator.predicate(
        `refund request ${i} status is valid`,
        validStatuses.includes(refundRequest.status as any),
      );
      // Validate timestamps are ISO 8601 format
      typia.assert<string & tags.Format<"date-time">>(refundRequest.created_at);
      typia.assert<string & tags.Format<"date-time">>(refundRequest.updated_at);
      typia.assert<(string & tags.Format<"date-time">) | null | undefined>(
        refundRequest.deleted_at,
      );
      // Validate reason text exists
      TestValidator.predicate(
        `refund request ${i} has reason text`,
        refundRequest.reason !== undefined &&
          refundRequest.reason !== null &&
          refundRequest.reason.length > 0,
      );
      // Validate item details
      typia.assert<string & tags.Format<"uuid">>(item.id);
      TestValidator.predicate(
        `item ${i} has order number`,
        item.order_number !== "",
      );
      TestValidator.predicate(
        `item ${i} has seller display name`,
        item.seller_display_name !== "",
      );
      TestValidator.predicate(
        `item ${i} has product variant name`,
        item.product_variant_name !== "",
      );
      TestValidator.predicate(
        `item ${i} has SKU code`,
        item.product_variant_sku_code !== "",
      );
      TestValidator.predicate(
        `item ${i} has price`,
        item.product_variant_price > 0,
      );
      TestValidator.predicate(
        `item ${i} quantity is valid`,
        item.quantity >= 1,
      );
      TestValidator.predicate(
        `item ${i} unit price is valid`,
        item.unit_price > 0,
      );
      TestValidator.predicate(`item ${i} subtotal is valid`, item.subtotal > 0);
      // Validate item status
      typia.assert<string>(item.status);
      const validItemStatuses = [
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ] as const;
      TestValidator.predicate(
        `item ${i} status is valid`,
        validItemStatuses.includes(item.status as any),
      );
      // Validate item timestamps
      typia.assert<string & tags.Format<"date-time">>(item.created_at);
      // Validate seller reference logic based on refund request status
      if (refundRequest.status === "pending") {
        TestValidator.equals(
          `pending refund approvedBySeller is null`,
          approvedBySeller,
          null,
        );
        TestValidator.equals(
          `pending refund rejectedBySeller is null`,
          rejectedBySeller,
          null,
        );
      } else if (refundRequest.status === "approved") {
        TestValidator.equals(
          `approved refund rejectedBySeller is null`,
          rejectedBySeller,
          null,
        );
        TestValidator.predicate(
          `approved refund has approvedBySeller`,
          approvedBySeller !== null && approvedBySeller !== undefined,
        );
        if (approvedBySeller) {
          typia.assert<string & tags.Format<"uuid">>(approvedBySeller.id);
          TestValidator.predicate(
            `approvedBySeller has display name`,
            approvedBySeller.display_name !== "",
          );
          typia.assert<string>(approvedBySeller.approval_status);
          TestValidator.predicate(
            `approvedBySeller approval_status is valid`,
            approvedBySeller.approval_status === "approved",
          );
          TestValidator.equals(
            `approvedBySeller is_suspended is false`,
            approvedBySeller.is_suspended,
            false,
          );
          typia.assert<string & tags.Format<"date-time">>(
            approvedBySeller.created_at,
          );
        }
      } else if (refundRequest.status === "rejected") {
        TestValidator.equals(
          `rejected refund approvedBySeller is null`,
          approvedBySeller,
          null,
        );
        TestValidator.predicate(
          `rejected refund has rejectedBySeller`,
          rejectedBySeller !== null && rejectedBySeller !== undefined,
        );
        if (rejectedBySeller) {
          typia.assert<string & tags.Format<"uuid">>(rejectedBySeller.id);
          TestValidator.predicate(
            `rejectedBySeller has display name`,
            rejectedBySeller.display_name !== "",
          );
          typia.assert<string>(rejectedBySeller.approval_status);
          TestValidator.predicate(
            `rejectedBySeller approval_status is valid`,
            rejectedBySeller.approval_status === "approved" ||
              rejectedBySeller.approval_status === "rejected",
          );
          TestValidator.equals(
            `rejectedBySeller is_suspended is false`,
            rejectedBySeller.is_suspended,
            false,
          );
          typia.assert<string & tags.Format<"date-time">>(
            rejectedBySeller.created_at,
          );
        }
      }
      // Validate deleted_at is null for active refund requests
      TestValidator.equals(
        `refund request ${i} deleted_at is null`,
        refundRequest.deleted_at,
        null,
      );
    }
    // Verify default sorting by created_at descending (newest first)
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        const prevCreated = new Date(data[i - 1].created_at).getTime();
        const currCreated = new Date(data[i].created_at).getTime();
        TestValidator.predicate(
          `refund requests sorted by created_at descending`,
          prevCreated >= currCreated,
        );
      }
    }
  } else {
    TestValidator.equals(
      "no refund requests found for new customer",
      pagination.records,
      0,
    );
    TestValidator.equals("data array empty when no records", data.length, 0);
  }
}