import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member with no post-purchase cancellation requests receives an empty paginated response.
 *
 * Validates the cancellation request listing endpoint returns correct empty state when a member has no cancellation requests. This test ensures proper data isolation by verifying that members only see their own requests and that the pagination structure is valid even with zero records.
 *
 * The test creates a fresh member account without any cancellation requests, then queries the cancellation requests endpoint. The response should contain valid pagination metadata with records=0, pages=0, and an empty data array.
 *
 * 1. Member registers with unique credentials via authorize_member_join.
 * 2. Member calls PATCH /shoppingMall/member/post-purchase/cancellation-requests with empty body.
 * 3. Validates response structure matches IPageIShoppingMallPostPurchaseCancellationRequest.ISummary.
 * 4. Verifies pagination metadata: current=1, records=0, pages=0.
 * 5. Verifies data array is empty, confirming no cancellation requests exist and data isolation is maintained.
 */
export async function test_api_post_purchase_cancellation_request_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Call cancellation requests endpoint with empty body (no requests created)
  const response =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.index(
      memberConnection,
      {
        body: {} satisfies IShoppingMallPostPurchaseCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata for empty result set
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.predicate("records is zero", response.pagination.records === 0);
  TestValidator.predicate("pages is zero", response.pagination.pages === 0);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  // 4. Validate data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.equals("data equals empty array", response.data, []);
}
