import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_items_oversight_timestamp_ranges_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticated member (create member + use token connection)
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallMember.IJoin;
  const authorized = await authorize_member_join(baseMemberConnection, {
    body: credentials,
  });
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 2) Prepare timestamp windows
  const now = new Date();
  const createdAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const createdAtTo = now.toISOString();
  const placedAtFrom = createdAtFrom;
  const placedAtTo = createdAtTo;
  const updatedAtFrom = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 14,
  ).toISOString();
  const updatedAtTo = createdAtTo;
  const createdRangeBody = {
    createdAtFrom,
    createdAtTo,
    placedAtFrom,
    placedAtTo,
    updatedAtFrom,
    updatedAtTo,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallOrderItem.IRequest;
  // 3) Call oversight with default sort (sortBy unset)
  const page1 =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      memberConnection,
      {
        body: createdRangeBody,
      },
    );
  typia.assert(page1);
  // 4) Validate created_at and ordering
  const ids: string[] = [];
  const createdTimes: number[] = [];
  const createdFromMs = new Date(createdAtFrom).getTime();
  const createdToMs = new Date(createdAtTo).getTime();
  for (const item of page1.data) {
    const createdAtMs = new Date(item.created_at).getTime();
    TestValidator.predicate(
      `item ${item.id} created_at within range`,
      () => createdAtMs >= createdFromMs && createdAtMs <= createdToMs,
    );
    ids.push(item.id);
    createdTimes.push(createdAtMs);
  }
  // Validate placed/updated ranges (inclusive)
  const placedFromMs = new Date(placedAtFrom).getTime();
  const placedToMs = new Date(placedAtTo).getTime();
  const updatedFromMs = new Date(updatedAtFrom).getTime();
  const updatedToMs = new Date(updatedAtTo).getTime();
  for (const item of page1.data) {
    const placedAtMs = new Date(item.placed_at).getTime();
    TestValidator.predicate(
      `item ${item.id} placed_at within range`,
      () => placedAtMs >= placedFromMs && placedAtMs <= placedToMs,
    );
    const updatedAtMs = new Date(item.updated_at).getTime();
    TestValidator.predicate(
      `item ${item.id} updated_at within range`,
      () => updatedAtMs >= updatedFromMs && updatedAtMs <= updatedToMs,
    );
  }
  // pagination metadata
  TestValidator.equals("page current", page1.pagination.current, 1);
  TestValidator.equals("page limit", page1.pagination.limit, 50);
  const expectedPages =
    page1.pagination.limit > 0
      ? Math.ceil(page1.pagination.records / page1.pagination.limit)
      : 0;
  TestValidator.equals("page pages", page1.pagination.pages, expectedPages);
  // default sort created_at DESC
  for (let i = 1; i < createdTimes.length; ++i) {
    TestValidator.predicate(
      `created_at sorted desc at index ${i}`,
      () => createdTimes[i - 1] >= createdTimes[i],
    );
  }
  // Deterministic ordering across repeated calls
  const page1Repeat =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      memberConnection,
      {
        body: createdRangeBody,
      },
    );
  typia.assert(page1Repeat);
  TestValidator.equals(
    "deterministic ids",
    page1Repeat.data.map((x) => x.id),
    ids,
  );
  // 5) Edge window with no records: far future
  const emptyFrom = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const emptyTo = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 730,
  ).toISOString();
  const emptyBody = {
    createdAtFrom: emptyFrom,
    createdAtTo: emptyTo,
    page: 1,
    limit: 50,
  } satisfies IShoppingMallOrderItem.IRequest;
  const emptyPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      memberConnection,
      {
        body: emptyBody,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty pages", emptyPage.pagination.pages, 0);
  TestValidator.predicate("empty data array", emptyPage.data.length === 0);
}
