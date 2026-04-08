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

export async function test_api_refund_request_administrator_oversight_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator oversight of a refund request list scoped to one order item.
   *
   * Validates that an authenticated administrator can browse the live refund request
   * list for a specific order item, and that the returned page only contains refund
   * requests for that exact item. The test also verifies that the live summary exposes
   * the current workflow state and review metadata without mutating any data.
   *
   * 1. Register and authenticate a new administrator account using an isolated connection.
   * 2. Request the refund-request list for a randomly generated order-item UUID with read-only filter criteria.
   * 3. Validate the returned page shape, pagination metadata, and each refund request summary.
   * 4. Confirm every returned item is scoped to the requested order item and that the response is stable for browsing.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 20,
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
  TestValidator.predicate(
    "refund request page is scoped to the requested order item",
    output.data.every((item) => item.orderItem.id === orderItemId),
  );
  TestValidator.predicate(
    "refund request summaries expose live workflow metadata",
    output.data.every((item) => {
      return (
        typeof item.id === "string" &&
        typeof item.reason === "string" &&
        typeof item.status === "string" &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string"
      );
    }),
  );
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 20);
}
