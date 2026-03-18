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

export async function test_api_order_items_member_filters_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member setup
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2) Broad query
  const sortBy = "placed_at" satisfies string;
  const page1 = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const placedAtFrom = new Date(
    new Date().getTime() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const placedAtTo = new Date().toISOString();
  const broadRequest: IShoppingMallOrderItem.IRequest = {
    page: page1,
    limit,
    sortBy,
    sortDirection: "desc",
    placedAtFrom: placedAtFrom as string & tags.Format<"date-time">,
    placedAtTo: placedAtTo as string & tags.Format<"date-time">,
  };
  const page1Result =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      { body: broadRequest },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination current equals requested page",
    page1Result.pagination.current,
    page1,
  );
  TestValidator.predicate(
    "page data length within limit",
    page1Result.data.length <= limit,
  );
  const page1Ids = page1Result.data.map((x) => x.id);
  for (const item of page1Result.data) {
    typia.assert(item);
  }
  // 3) Page 2
  const page2 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const broadRequestPage2: IShoppingMallOrderItem.IRequest = {
    ...broadRequest,
    page: page2,
  };
  const page2Result =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      { body: broadRequestPage2 },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "pagination current equals requested page 2",
    page2Result.pagination.current,
    page2,
  );
  TestValidator.predicate(
    "page2 data length within limit",
    page2Result.data.length <= limit,
  );
  const page2Ids = page2Result.data.map((x) => x.id);
  const overlapSize = page1Ids.reduce((acc, id) => {
    return page2Ids.includes(id) ? acc + 1 : acc;
  }, 0);
  TestValidator.equals(
    "no overlap between page1 and page2 ids",
    overlapSize,
    0,
  );
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    const lastOnPage1 = page1Result.data[page1Result.data.length - 1];
    const firstOnPage2 = page2Result.data[0];
    TestValidator.predicate(
      "ordering consistent at boundary",
      firstOnPage2.placed_at <= lastOnPage1.placed_at,
    );
  }
  // 4) Narrower filter
  const chosenStatus: string | undefined =
    page1Result.data[0]?.line_item_status;
  const narrowRequest: IShoppingMallOrderItem.IRequest =
    chosenStatus !== undefined
      ? {
          page: page1,
          limit,
          sortBy,
          sortDirection: "desc",
          lineItemStatus: chosenStatus,
          placedAtFrom: broadRequest.placedAtFrom,
          placedAtTo: broadRequest.placedAtTo,
        }
      : {
          page: page1,
          limit,
          sortBy,
          sortDirection: "desc",
          placedAtFrom: new Date(
            new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 10,
          ).toISOString() as string & tags.Format<"date-time">,
          placedAtTo: new Date(
            new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 9,
          ).toISOString() as string & tags.Format<"date-time">,
        };
  const narrowResult =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      { body: narrowRequest },
    );
  typia.assert(narrowResult);
  const broadIdSet = new Set(page1Ids);
  TestValidator.predicate(
    "narrow results subset of broad page1",
    narrowResult.data.every((x) => broadIdSet.has(x.id)),
  );
  // 5) Empty-result behavior
  const emptyRequest: IShoppingMallOrderItem.IRequest = {
    page: page1,
    limit,
    sortBy,
    sortDirection: "desc",
    placedAtFrom: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 20,
    ).toISOString() as string & tags.Format<"date-time">,
    placedAtTo: new Date(
      new Date().getTime() - 1000 * 60 * 60 * 24 * 365 * 19,
    ).toISOString() as string & tags.Format<"date-time">,
  };
  const emptyResult =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty page data is empty", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty records metadata is zero",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty pages metadata is zero",
    emptyResult.pagination.pages,
    0,
  );
}
