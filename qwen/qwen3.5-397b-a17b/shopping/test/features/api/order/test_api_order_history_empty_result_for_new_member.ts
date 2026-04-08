import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test order history returns empty result for newly registered member.
 *
 * Validates that a newly registered member with no order history receives a properly structured empty paginated result when retrieving their order list. The member joins the platform but has not placed any orders yet, then retrieves their order list through the member orders endpoint.
 *
 * This test ensures the order history endpoint correctly handles the edge case of zero orders by returning an empty data array with accurate pagination metadata. The response structure must be consistent with non-empty results, containing valid pagination fields (current page, limit, records count, total pages) even when no orders exist.
 *
 * 1. New member registers with unique email and credentials using authorize_member_join utility.
 * 2. Member retrieves their order history through PATCH /shoppingMall/member/orders endpoint.
 * 3. Validates response structure using typia.assert for complete type validation.
 * 4. Validates data array is empty (length 0) since member has no orders.
 * 5. Validates pagination metadata: current page is 1, records count is 0, total pages is 0.
 */
export async function test_api_order_history_empty_result_for_new_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with no order history
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve order history for new member (should be empty)
  const orderList = await api.functional.shoppingMall.member.orders.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", orderList.data.length, 0);
  // 4. Validate pagination metadata for empty result
  TestValidator.equals("current page", orderList.pagination.current, 1);
  TestValidator.equals("records count", orderList.pagination.records, 0);
  TestValidator.equals("total pages", orderList.pagination.pages, 0);
  TestValidator.predicate("limit is positive", orderList.pagination.limit > 0);
}
