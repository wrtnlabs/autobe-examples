import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_list_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test refund request listing by order item.
   *
   * Validates that a customer can call the refund-request listing endpoint for a specific order item and receive a paginated summary response with the expected DTO structure.
   *
   * 1. Register and authenticate a customer using an isolated customer connection.
   * 2. Call the refund-request list endpoint with a valid order-item UUID and list criteria.
   * 3. Validate the paginated response shape and each refund-request summary payload.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const body = {
    page: 1,
    limit: 20,
    sort: "-createdAt",
  } satisfies IMallPlatformRefundRequest.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orderItems.refundRequests.index(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals("current page", output.pagination.current, 1);
  TestValidator.equals("page limit", output.pagination.limit, 20);
  TestValidator.predicate(
    "record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "refund request list is an array",
    Array.isArray(output.data),
  );
  for (const item of output.data) {
    typia.assert(item);
  }
}
