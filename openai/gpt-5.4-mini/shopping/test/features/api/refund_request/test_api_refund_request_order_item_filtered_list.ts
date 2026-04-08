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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify administrator-scoped refund-request pagination for a single order item.
 *
 * This test authenticates an administrator and exercises the order-item refund-request
 * list endpoint with realistic list criteria. It validates that the endpoint returns a
 * properly shaped paginated collection and that pagination metadata is consistent with
 * the requested page and limit.
 *
 * Because the provided API surface does not include creation fixtures for refund requests,
 * the test is intentionally written as a smoke-style browse verification rather than a
 * seeded data contract test. This keeps the test compilation-safe while still validating
 * the endpoint wiring, authentication, and paginated response shape.
 *
 * 1. Authenticate as an administrator through a dedicated connection.
 * 2. Call the refund-request list endpoint for a specific order item identifier.
 * 3. Validate pagination metadata and response structure.
 */
export async function test_api_refund_request_order_item_filtered_list(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    search: RandomGenerator.alphabets(5),
    page: 1,
    limit: 10,
    sort: "-createdAt",
  } satisfies IMallPlatformRefundRequest.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.index(
      administratorConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page should be reflected in pagination",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit should be reflected in pagination",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "record count should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "every refund request summary should have a target order item object",
    output.data.every(
      (item) => item.orderItem !== null && item.orderItem !== undefined,
    ),
  );
}
