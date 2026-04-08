import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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
 * Verify administrator-scoped refund request listing by order item.
 *
 * Validates that an authenticated administrator can query the live refund-request
 * page for a specific order item using pagination and filter controls. The test
 * checks the paginated response shape and ensures the nested order item,
 * customer, seller, and administrator summary relations are returned in the
 * expected read-only list form.
 *
 * 1. Authenticate as an administrator.
 * 2. Request the refund-request page for a specific order item.
 * 3. Validate pagination metadata and nested summary relations.
 */
export async function test_api_refund_request_list_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.index(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.content({ paragraphs: 1 }),
          ),
          status: "pending",
          hasReviewed: false,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is preserved",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is preserved",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "refund request page data exists",
    Array.isArray(output.data),
  );
  if (output.data.length > 0) {
    const first = output.data[0];
    typia.assert(first);
    typia.assert(first.orderItem);
    typia.assert(first.customer);
    typia.assert(first.seller);
    if (first.administrator !== null) typia.assert(first.administrator);
  }
}
