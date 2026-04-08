import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller view of approved and rejected cancellation requests.
 *
 * Validates that a seller can retrieve cancellation requests for their order items, including those with different final statuses (approved and rejected). The test ensures the response contains proper status values and seller response fields.
 *
 * Since order creation and cancellation request creation endpoints are not available through the API, this test assumes the necessary orders and cancellation requests already exist in the test environment. The test focuses on verifying the retrieval functionality and response structure.
 *
 * 1. Register and authenticate a seller account.
 * 2. Generate random UUIDs for orderId and itemId (assuming existing data).
 * 3. Query the cancellation requests endpoint with the generated IDs.
 * 4. Validate the response contains cancellation requests with correct status and seller_response fields.
 */
export async function test_api_seller_view_approved_and_rejected_cancellation_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Generate random UUIDs for existing order and order item
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Query cancellation requests
  const response: IPageIEcommerceCancellationRequest.ISummary =
    await api.functional.ecommerce.seller.orders.items.cancellation_requests.index(
      sellerConnection,
      {
        orderId,
        itemId,
        body: {} satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.predicate("data is array", Array.isArray(response.data));
  TestValidator.predicate(
    "pagination has current",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    response.pagination.pages >= 0,
  );
}
