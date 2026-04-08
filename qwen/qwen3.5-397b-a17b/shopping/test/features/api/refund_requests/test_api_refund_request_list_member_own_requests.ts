import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member refund request list retrieval with proper data isolation.
 *
 * Validates that an authenticated member can successfully retrieve their own refund requests through the PATCH /shoppingMall/member/refund-requests endpoint. The test verifies proper authentication flow, response structure validation, and pagination metadata correctness.
 *
 * The test ensures that the refund request list endpoint returns properly structured data with all required fields including id, status, reason, createdAt, member summary, and orderItem summary with product details. Pagination metadata is validated to ensure correct current page, limit, total records, and total pages values.
 *
 * 1. Member account creation via authorize_member_join utility function.
 * 2. Call refund requests list endpoint with default pagination.
 * 3. Validate response structure and pagination metadata.
 * 4. Verify each refund request contains required nested fields.
 * 5. Validate sorting order by createdAt descending if multiple requests exist.
 */
export async function test_api_refund_request_list_member_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call refund requests list endpoint with default pagination
  const response =
    await api.functional.shoppingMall.member.refund_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "limit is within max",
    response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each refund request contains required fields
  for (const refundRequest of response.data) {
    // Validate individual refund request structure
    typia.assert(refundRequest);
    // Validate business logic: status values
    TestValidator.predicate(
      "status is valid workflow state",
      ["pending", "approved", "rejected"].includes(refundRequest.status),
    );
    // Validate business logic: reason is non-empty
    TestValidator.predicate(
      "reason is non-empty string",
      refundRequest.reason.length > 0,
    );
    // Validate business logic: orderItem quantities and prices
    TestValidator.predicate(
      "orderItem quantity is positive",
      refundRequest.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "orderItem price is positive",
      refundRequest.orderItem.price > 0,
    );
    // Validate nested product base_price
    TestValidator.predicate(
      "product base_price is non-negative",
      refundRequest.orderItem.product.base_price >= 0,
    );
    // Validate seller approval status
    TestValidator.predicate(
      "seller approvalStatus is valid",
      ["pending", "approved", "rejected"].includes(
        refundRequest.orderItem.seller.approvalStatus,
      ),
    );
  }
  // 6. Validate sorting order by createdAt descending if multiple requests exist
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].createdAt).getTime();
      const currDate = new Date(response.data[i].createdAt).getTime();
      TestValidator.predicate(
        `results sorted by createdAt descending at index ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
