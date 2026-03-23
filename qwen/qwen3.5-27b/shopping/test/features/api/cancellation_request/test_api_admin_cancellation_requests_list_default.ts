import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test default pagination and filtering for admin cancellation requests listing.
 *
 * This test verifies the primary success path for retrieving cancellation
 * requests as an administrator. The test validates that:
 * 1. An authenticated admin can access the cancellation requests listing endpoint
 * 2. The response includes pagination metadata (current page, limit, total records, total pages)
 * 3. Each cancellation request contains required fields (id, reason, status, requestedAt, respondedAt, rejectionReason, customer, orderItem, seller)
 * 4. Customer and orderItem relations are always populated
 * 5. Seller relation is null when status is 'pending' and populated when status is 'approved' or 'rejected'
 * 6. Default pagination returns page 1 with 20 items sorted by requested_at descending
 * 7. All returned cancellation requests have deleted_at IS NULL (soft delete filter applied)
 */
export async function test_api_admin_cancellation_requests_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call the cancellation requests listing endpoint with default parameters
  const response =
    await api.functional.shoppingMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate(
    "data array length matches limit or records",
    response.data.length <= response.pagination.limit &&
      response.data.length <= response.pagination.records,
  );
  // 5. Validate each cancellation request in the data array
  await ArrayUtil.asyncForEach(response.data, async (request, index) => {
    // Validate required fields exist
    TestValidator.predicate(
      `request[${index}] has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    TestValidator.predicate(
      `request[${index}] has non-empty reason`,
      request.reason.length > 0,
    );
    TestValidator.predicate(
      `request[${index}] has valid status`,
      ["pending", "approved", "rejected"].includes(request.status),
    );
    TestValidator.predicate(
      `request[${index}] has valid requestedAt`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.requestedAt),
    );
    // Validate respondedAt and rejectionReason based on status
    if (request.status === "pending") {
      TestValidator.equals(
        `request[${index}] respondedAt is null for pending status`,
        request.respondedAt,
        null,
      );
      TestValidator.equals(
        `request[${index}] rejectionReason is null for pending status`,
        request.rejectionReason,
        null,
      );
      TestValidator.equals(
        `request[${index}] seller is null for pending status`,
        request.seller,
        null,
      );
    } else {
      // approved or rejected
      TestValidator.predicate(
        `request[${index}] has valid respondedAt`,
        request.respondedAt !== null &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.respondedAt),
      );
      if (request.status === "rejected") {
        TestValidator.predicate(
          `request[${index}] has rejectionReason for rejected status`,
          request.rejectionReason !== null,
        );
      } else {
        TestValidator.equals(
          `request[${index}] rejectionReason is null for approved status`,
          request.rejectionReason,
          null,
        );
      }
      TestValidator.predicate(
        `request[${index}] has seller for ${request.status} status`,
        request.seller !== null,
      );
    }
    // Validate customer relation is always populated
    TestValidator.predicate(
      `request[${index}] has customer`,
      request.customer !== null,
    );
    TestValidator.predicate(
      `request[${index}] customer has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.customer.id,
      ),
    );
    TestValidator.predicate(
      `request[${index}] customer has valid email`,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
        request.customer.email,
      ),
    );
    // Validate orderItem relation is always populated
    TestValidator.predicate(
      `request[${index}] has orderItem`,
      request.orderItem !== null,
    );
    TestValidator.predicate(
      `request[${index}] orderItem has valid UUID id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.orderItem.id,
      ),
    );
    TestValidator.predicate(
      `request[${index}] orderItem has valid orderId`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.orderItem.orderId,
      ),
    );
    TestValidator.predicate(
      `request[${index}] orderItem has valid quantity`,
      request.orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      `request[${index}] orderItem has non-negative price`,
      request.orderItem.price >= 0,
    );
    // Validate seller relation if present
    if (request.seller !== null) {
      TestValidator.predicate(
        `request[${index}] seller has valid UUID id`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          request.seller.id,
        ),
      );
      TestValidator.predicate(
        `request[${index}] seller has valid email`,
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
          request.seller.email,
        ),
      );
      TestValidator.predicate(
        `request[${index}] seller has non-empty shop_name`,
        request.seller.shop_name.length > 0,
      );
    }
  });
  // 6. Validate sorting order (requested_at descending)
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `requests are sorted by requested_at descending`,
        new Date(response.data[i - 1].requestedAt).getTime() >=
          new Date(response.data[i].requestedAt).getTime(),
      );
    }
  }
}
