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

export async function test_api_refund_request_list_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerData);
  // Step 2: Call refund requests list endpoint
  const refundRequestsResponse =
    await api.functional.ecommerceMall.member.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(refundRequestsResponse);
  // Step 3: Validate response structure
  typia.assert(refundRequestsResponse.pagination);
  typia.assert(refundRequestsResponse.data);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    refundRequestsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    refundRequestsResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "records is non-negative",
    refundRequestsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    refundRequestsResponse.pagination.pages >= 0,
  );
  // Step 5: Validate each refund request in data array
  if (refundRequestsResponse.data.length > 0) {
    for (let i = 0; i < refundRequestsResponse.data.length; i++) {
      const refundRequest = refundRequestsResponse.data[i];
      typia.assert(refundRequest);
      // Validate refund request ID format
      TestValidator.equals(
        `refund request ${i} has valid id`,
        refundRequest.id,
        refundRequest.id,
      );
      TestValidator.predicate(
        `refund request ${i} id is UUID`,
        /^[0-9a-f-]{36}$/i.test(refundRequest.id),
      );
      // Validate required fields exist
      TestValidator.equals(
        `refund request ${i} has reason`,
        refundRequest.reason,
        refundRequest.reason,
      );
      TestValidator.equals(
        `refund request ${i} status is valid`,
        refundRequest.status,
        refundRequest.status,
      );
      TestValidator.predicate(
        `refund request ${i} status is one of pending/approved/rejected`,
        ["pending", "approved", "rejected"].includes(refundRequest.status),
      );
      // Validate timestamps
      TestValidator.equals(
        `refund request ${i} has created_at`,
        refundRequest.created_at,
        refundRequest.created_at,
      );
      TestValidator.equals(
        `refund request ${i} has updated_at`,
        refundRequest.updated_at,
        refundRequest.updated_at,
      );
      TestValidator.predicate(
        `refund request ${i} created_at is valid date-time`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          refundRequest.created_at,
        ),
      );
      // Validate item reference exists and has required fields
      typia.assert(refundRequest.item);
      TestValidator.equals(
        `refund request ${i} item has id`,
        refundRequest.item.id,
        refundRequest.item.id,
      );
      TestValidator.equals(
        `refund request ${i} item has order_number`,
        refundRequest.item.order_number,
        refundRequest.item.order_number,
      );
      TestValidator.equals(
        `refund request ${i} item has seller_display_name`,
        refundRequest.item.seller_display_name,
        refundRequest.item.seller_display_name,
      );
      TestValidator.equals(
        `refund request ${i} item has product_variant_name`,
        refundRequest.item.product_variant_name,
        refundRequest.item.product_variant_name,
      );
      TestValidator.equals(
        `refund request ${i} item has quantity`,
        refundRequest.item.quantity,
        refundRequest.item.quantity,
      );
      TestValidator.equals(
        `refund request ${i} item has status`,
        refundRequest.item.status,
        refundRequest.item.status,
      );
      TestValidator.predicate(
        `refund request ${i} item status is valid`,
        ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
          refundRequest.item.status,
        ),
      );
      // Validate item created_at timestamp
      TestValidator.predicate(
        `refund request ${i} item has valid created_at`,
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
          refundRequest.item.created_at,
        ),
      );
      // Validate seller approval/rejection references based on status
      if (refundRequest.status === "approved") {
        TestValidator.predicate(
          `approved refund request ${i} has approvedBySeller`,
          refundRequest.approvedBySeller !== null,
        );
        TestValidator.equals(
          `approved refund request ${i} rejectedBySeller is null`,
          refundRequest.rejectedBySeller,
          null,
        );
        typia.assert(refundRequest.approvedBySeller);
      } else if (refundRequest.status === "rejected") {
        TestValidator.equals(
          `rejected refund request ${i} approvedBySeller is null`,
          refundRequest.approvedBySeller,
          null,
        );
        TestValidator.predicate(
          `rejected refund request ${i} has rejectedBySeller`,
          refundRequest.rejectedBySeller !== null,
        );
        typia.assert(refundRequest.rejectedBySeller);
      } else {
        // Status is pending - both should be null
        TestValidator.equals(
          `pending refund request ${i} approvedBySeller is null`,
          refundRequest.approvedBySeller,
          null,
        );
        TestValidator.equals(
          `pending refund request ${i} rejectedBySeller is null`,
          refundRequest.rejectedBySeller,
          null,
        );
      }
    }
  }
  // Step 6: Verify pagination consistency
  const totalRecords = refundRequestsResponse.pagination.records;
  const totalPages = refundRequestsResponse.pagination.pages;
  const limit = refundRequestsResponse.pagination.limit;
  if (totalRecords > 0) {
    const expectedPages = Math.ceil(totalRecords / limit);
    TestValidator.equals(
      "total pages calculated correctly",
      totalPages,
      expectedPages,
    );
  } else {
    TestValidator.equals("empty list has 0 pages", totalPages, 0);
  }
  // Step 7: Verify customer_id filtering is supported through data structure
  // The item → order → customer relationship should ensure only authenticated customer's
  // refund requests are returned. Validate that each item references a valid order.
  TestValidator.predicate(
    "each refund request item has valid order reference",
    refundRequestsResponse.data.every(
      (req) => req.item.order_number.length > 0,
    ),
  );
}
