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

export async function test_api_order_items_authorization_member_scoping_no_leakage(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member A registration + authenticated actor
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberAAuthorized);
  // 2) Member B registration + authenticated actor
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(memberBAuthorized);
  // 3) Member A: get at least one order item in its scope
  const pageA = await api.functional.shoppingMall.member.order_items.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(pageA);
  TestValidator.predicate(
    "member A has at least one order item to sample",
    pageA.data.length >= 1,
  );
  const sampledItemA = pageA.data[0]!;
  const shoppingOrderIdA = sampledItemA.shopping_mall_order_id;
  // 4) Member B: query with member A identifier; must behave like no matches
  const pageB = await api.functional.shoppingMall.member.order_items.index(
    memberBConnection,
    {
      body: {
        shoppingOrderId: shoppingOrderIdA,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(pageB);
  TestValidator.equals(
    "member B records should be 0",
    pageB.pagination.records,
    0,
  );
  TestValidator.equals("member B pages should be 0", pageB.pagination.pages, 0);
  TestValidator.equals("member B data should be empty", pageB.data.length, 0);
}
