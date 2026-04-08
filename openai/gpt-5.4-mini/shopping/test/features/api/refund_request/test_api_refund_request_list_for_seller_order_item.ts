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

export async function test_api_refund_request_list_for_seller_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test seller-scoped refund request listing for a specific order item.
   *
   * Validates that a newly authenticated seller can query the live refund
   * request list for one of their own order items and receive a paginated page
   * containing the current refund request summary only. The test focuses on the
   * seller review workflow, request scoping, pagination controls, and the fact
   * that this endpoint is read-only and does not expose snapshot history.
   *
   * 1. Register and authenticate a seller account using an isolated connection.
   * 2. Call the seller order-item refund request listing endpoint for a scoped order item id.
   * 3. Validate pagination metadata and confirm the response is page-shaped.
   * 4. Verify each returned refund request matches the live summary DTO and remains scoped to the requested order item.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    search: RandomGenerator.alphabets(5),
    sort: RandomGenerator.pick([
      "-createdAt",
      "+createdAt",
      "-updatedAt",
      "+updatedAt",
    ] as const),
    page: 1,
    limit: 10,
  } satisfies IMallPlatformRefundRequest.IRequest;
  const output =
    await api.functional.mallPlatform.seller.orderItems.refundRequests.index(
      sellerConnection,
      {
        orderItemId,
        body: requestBody,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "refund request response has pagination metadata",
    () => {
      return (
        output.pagination.current >= 0 &&
        output.pagination.limit >= 0 &&
        output.pagination.records >= 0 &&
        output.pagination.pages >= 0
      );
    },
  );
  TestValidator.equals(
    "requested page is echoed in pagination current",
    output.pagination.current,
    requestBody.page ?? 1,
  );
  TestValidator.equals(
    "requested limit is echoed in pagination limit",
    output.pagination.limit,
    requestBody.limit ?? 0,
  );
  TestValidator.predicate(
    "response data is an array",
    Array.isArray(output.data),
  );
  for (const refundRequest of output.data) {
    typia.assert(refundRequest);
    TestValidator.predicate(
      "refund request belongs to scoped order item",
      refundRequest.orderItem.id === orderItemId,
    );
    TestValidator.predicate(
      "refund request contains live summary fields",
      refundRequest.id.length > 0 &&
        refundRequest.reason.length > 0 &&
        refundRequest.status.length > 0 &&
        refundRequest.createdAt.length > 0 &&
        refundRequest.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "review metadata is internally consistent",
      refundRequest.reviewedAt === null
        ? refundRequest.reviewNote === null
        : true,
    );
  }
}
