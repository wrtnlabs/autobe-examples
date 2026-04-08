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
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_refund_requests_search_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Search refund requests for one order item from a seller-scoped context.
   *
   * This test validates the seller-authenticated refund-request listing endpoint using a stable paginated request and checks the returned summary payload shape.
   * It confirms the endpoint responds with paginated refund-request summaries and that the response can be safely consumed for seller-side review screens.
   *
   * 1. Authenticate a seller through the available join utility.
   * 2. Query the refund-request list for a scoped order item identifier.
   * 3. Validate pagination metadata, summary DTO conformance, and default ordering when multiple records exist.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformRefundRequest.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    output.pagination.pages >= 0,
  );
  for (const item of output.data) {
    typia.assert(item);
    TestValidator.equals(
      "refund request is scoped to the requested order item",
      item.orderItem.id,
      orderItemId,
    );
  }
  for (let i = 1; i < output.data.length; ++i) {
    TestValidator.predicate(
      "refund requests are ordered newest-first by default",
      output.data[i - 1].createdAt >= output.data[i].createdAt,
    );
  }
}
