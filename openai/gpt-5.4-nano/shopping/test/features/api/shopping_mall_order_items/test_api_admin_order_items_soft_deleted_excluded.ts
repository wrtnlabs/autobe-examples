import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_soft_deleted_excluded(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const credentialsBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: credentialsBody,
  });
  typia.assert(authorized);
  // 2) Fetch a candidate order item to delete
  const firstPage =
    await api.functional.shoppingMall.admin.admin.order_items.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "should have at least one order item to delete",
    firstPage.data.length > 0,
  );
  const orderItemId = firstPage.data[0]!.id;
  // 3) Delete the selected order item record
  await api.functional.shoppingMall.admin.admin.order_items.erase(
    adminConnection,
    {
      orderItemId,
    },
  );
  // 4) Re-list and ensure deleted item is excluded
  const secondPage =
    await api.functional.shoppingMall.admin.admin.order_items.index(
      adminConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(secondPage);
  // 5) Validate results: all returned items must be not deleted
  for (const item of secondPage.data) {
    TestValidator.equals(
      "deleted_at should be null for returned items",
      item.deleted_at,
      null,
    );
  }
  const appeared = secondPage.data.some((item) => item.id === orderItemId);
  TestValidator.predicate(
    "previously deleted order item must not appear in results",
    !appeared,
  );
}
