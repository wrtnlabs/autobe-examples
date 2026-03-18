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

export async function test_api_order_items_oversight_filter_by_status_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // Use actor-specific connection with access token
  const oversightConnection: api.IConnection = { host: connection.host };
  oversightConnection.headers = {
    Authorization: member.token.access,
  };
  // Establish a lineItemStatus that exists in the seller scope by sampling
  // the first returned item.
  const firstPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      oversightConnection,
      {
        body: {
          page: 1 satisfies IShoppingMallOrderItem.IRequest["page"],
          limit: 10 satisfies IShoppingMallOrderItem.IRequest["limit"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  if (firstPage.data.length === 0) {
    TestValidator.equals("empty data when no records", firstPage.data, []);
    TestValidator.equals(
      "pagination.pages when no records",
      firstPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "pagination.records when no records",
      firstPage.pagination.records,
      0,
    );
    return;
  }
  const lineItemStatus: string = firstPage.data[0].line_item_status;
  const filteredPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      oversightConnection,
      {
        body: {
          lineItemStatus,
          page: 1 satisfies IShoppingMallOrderItem.IRequest["page"],
          limit: 10 satisfies IShoppingMallOrderItem.IRequest["limit"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "all returned items have requested line_item_status",
    filteredPage.data.every((x) => x.line_item_status === lineItemStatus),
  );
  TestValidator.predicate(
    "no soft-deleted items returned (deleted_at is null)",
    filteredPage.data.every((x) => x.deleted_at === null),
  );
  // Edge: request a page beyond the last page for the same filter.
  const beyondPageNumber: number =
    filteredPage.pagination.pages === 0 ? 1 : filteredPage.pagination.pages + 1;
  const beyondPage =
    await api.functional.shoppingMall.member.order_items.oversight.index(
      oversightConnection,
      {
        body: {
          lineItemStatus,
          page: beyondPageNumber satisfies IShoppingMallOrderItem.IRequest["page"],
          limit: 10 satisfies IShoppingMallOrderItem.IRequest["limit"],
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond-page data is empty", beyondPage.data.length, 0);
  TestValidator.equals(
    "pagination.records consistent for same filter",
    beyondPage.pagination.records,
    filteredPage.pagination.records,
  );
  TestValidator.equals(
    "pagination.pages consistent for same filter",
    beyondPage.pagination.pages,
    filteredPage.pagination.pages,
  );
}
