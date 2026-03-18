import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_requests_date_range_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string &
        tags.Format<"password">,
    } satisfies IShoppingMallMember.IJoin,
  });
  // No dedicated creation utility is provided for cancellation requests/order items.
  // Discover existing active records and validate that date-range filtering and
  // requested_at sorting behave deterministically.
  const discovered: IPageIShoppingMallCancellationRequest.ISummary =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(discovered);
  const active = discovered.data.filter((x) => x.deleted_at === null);
  TestValidator.predicate(
    "should have at least 3 active cancellation requests to validate filtering",
    () => active.length >= 3,
  );
  const sorted = [...active].sort((a, b) =>
    a.requested_at.localeCompare(b.requested_at),
  );
  const d0 = sorted[0].requested_at;
  const d2 = sorted[2].requested_at;
  const requestedAtFrom = d0 satisfies string & tags.Format<"date-time">;
  const requestedAtTo = d2 satisfies string & tags.Format<"date-time">;
  const shoppingMallOrderItemId = sorted[0].shopping_mall_order_item_id;
  const expected = active
    .filter(
      (x) =>
        x.shopping_mall_order_item_id === shoppingMallOrderItemId &&
        x.requested_at >= requestedAtFrom &&
        x.requested_at <= requestedAtTo,
    )
    .sort((a, b) => a.requested_at.localeCompare(b.requested_at));
  const response =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          shoppingMallOrderItemId,
          requestedAtFrom,
          requestedAtTo,
          sortBy: "requested_at",
          sortDirection: "asc",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(response);
  // pagination.records equals number of matching records (not just returned page size)
  TestValidator.equals(
    "pagination records equals number of matching records",
    response.pagination.records,
    expected.length,
  );
  // response.data only includes records within the requested_at range
  TestValidator.predicate(
    "response data should all be within requested_at range",
    () =>
      response.data.every(
        (x) =>
          x.shopping_mall_order_item_id === shoppingMallOrderItemId &&
          x.requested_at >= requestedAtFrom &&
          x.requested_at <= requestedAtTo,
      ),
  );
  // Items are ordered by requested_at ascending
  const ordered = [...response.data].sort((a, b) =>
    a.requested_at.localeCompare(b.requested_at),
  );
  TestValidator.equals(
    "response ordered by requested_at asc",
    response.data.map((x) => x.id),
    ordered.map((x) => x.id),
  );
  // For each returned item, seller_decisioned_at/seller_response_reason consistency
  const expectedById = new Map(expected.map((x) => [x.id, x] as const));
  for (const item of response.data) {
    const exp = expectedById.get(item.id);
    TestValidator.predicate("matching fixture exists", () => exp !== undefined);
    const e = exp!;
    TestValidator.equals(
      "seller_decisioned_at consistency",
      item.seller_decisioned_at,
      e.seller_decisioned_at,
    );
    TestValidator.equals(
      "seller_response_reason consistency",
      item.seller_response_reason,
      e.seller_response_reason,
    );
  }
}
