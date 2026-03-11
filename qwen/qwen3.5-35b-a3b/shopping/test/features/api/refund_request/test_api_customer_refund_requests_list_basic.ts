import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_requests_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the system to create account and obtain auth tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    },
  });
  typia.assert(customerAuth);
  // Create customer connection with token for authenticated requests
  const customerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 2. Call refund request status endpoint with default pagination parameters
  const defaultPage = 1;
  const defaultLimit = 20;
  const defaultResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerTokenConnection,
      {
        body: {
          page: defaultPage,
          limit: defaultLimit,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Verify endpoint returns paginated response structure
  TestValidator.equals(
    "has pagination metadata",
    defaultResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(defaultResponse.data),
    true,
  );
  // 4. Verify pagination metadata fields are present and correct
  TestValidator.equals(
    "current page correct",
    defaultResponse.pagination.current,
    defaultPage,
  );
  TestValidator.equals(
    "limit correct",
    defaultResponse.pagination.limit,
    defaultLimit,
  );
  TestValidator.predicate(
    "total records non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  // 5. Verify pages calculation matches records and limit
  if (defaultResponse.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when records is 0",
      defaultResponse.pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "pages calculation correct",
      defaultResponse.pagination.pages,
      Math.ceil(
        defaultResponse.pagination.records / defaultResponse.pagination.limit,
      ),
    );
  }
  // 6. Test sorting by createdAt in descending order
  const sortDescResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerTokenConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortDescResponse);
  // 7. Test sorting by createdAt in ascending order
  const sortAscResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerTokenConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortAscResponse);
  // 8. Test sorting by requestStatus in descending order
  const statusSortDescResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerTokenConnection,
      {
        body: {
          sortBy: "requestStatus",
          sortOrder: "desc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(statusSortDescResponse);
  // 9. Test sorting by requestStatus in ascending order
  const statusSortAscResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerTokenConnection,
      {
        body: {
          sortBy: "requestStatus",
          sortOrder: "asc",
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(statusSortAscResponse);
  // 10. Verify pagination metadata is preserved across all sorting operations
  TestValidator.equals(
    "sort desc pagination current correct",
    sortDescResponse.pagination.current,
    defaultPage,
  );
  TestValidator.equals(
    "sort asc pagination limit correct",
    sortAscResponse.pagination.limit,
    defaultLimit,
  );
  TestValidator.equals(
    "status sort desc pagination records correct",
    statusSortDescResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  // 11. Verify refund request data structure when records exist
  if (defaultResponse.data.length > 0) {
    const firstRequest = defaultResponse.data[0];
    typia.assert(firstRequest!);
    // Verify all required fields are present
    TestValidator.equals(
      "refund request has id",
      firstRequest!.id !== undefined,
      true,
    );
    TestValidator.equals(
      "refund request has orderItem",
      firstRequest!.orderItem !== undefined,
      true,
    );
    TestValidator.equals(
      "refund request has reason",
      firstRequest!.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "refund request has requestStatus",
      firstRequest!.requestStatus !== undefined,
      true,
    );
    TestValidator.equals(
      "refund request has createdAt",
      firstRequest!.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      "refund request has updatedAt",
      firstRequest!.updatedAt !== undefined,
      true,
    );
    // Verify orderItem structure has required fields
    TestValidator.equals(
      "orderItem has id",
      firstRequest!.orderItem.id !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has item_status",
      firstRequest!.orderItem.item_status !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has quantity",
      firstRequest!.orderItem.quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has unit_price",
      firstRequest!.orderItem.unit_price !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has product_snapshot",
      firstRequest!.orderItem.product_snapshot !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has variant_snapshot",
      firstRequest!.orderItem.variant_snapshot !== undefined,
      true,
    );
    TestValidator.equals(
      "orderItem has seller_profile_snapshot",
      firstRequest!.orderItem.seller_profile_snapshot !== undefined,
      true,
    );
  }
  // 12. Verify requestStatus is one of valid values
  if (defaultResponse.data.length > 0) {
    const validStatuses = ["pending", "approved", "rejected"] as const;
    const status = defaultResponse.data[0].requestStatus;
    TestValidator.predicate(
      "requestStatus is valid",
      validStatuses.includes(status),
    );
  }
}
