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

export async function test_api_refund_request_empty_list_for_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies administrator-scoped refund request browsing returns an empty page
   * for an order item that has no refund request.
   *
   * This scenario validates the read-only list behavior for the scoped refund
   * request endpoint. It ensures the administrator can authenticate, query the
   * refund-request list for a specific order item, and receive a valid empty
   * paginated response instead of an invented record or any unintended state
   * mutation.
   *
   * 1. Authenticate as an administrator through the dedicated join utility.
   * 2. Query the refund-request list for a randomly chosen order item id.
   * 3. Validate that the response contains an empty data array and zero-count
   *    pagination metadata.
   */
  const adminAuthConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminAuthConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.index(
      adminConnection,
      {
        orderItemId,
        body: {} satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("refund request data should be empty", output.data, []);
  TestValidator.equals(
    "refund request pagination should be empty",
    output.pagination,
    {
      current: 1,
      limit: 0,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
  );
}
