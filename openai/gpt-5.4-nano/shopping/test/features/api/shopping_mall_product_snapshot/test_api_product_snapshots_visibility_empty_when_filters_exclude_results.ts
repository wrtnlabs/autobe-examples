import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_product_snapshots_visibility_empty_when_filters_exclude_results(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const sellerId = "00000000-0000-4000-8000-000000000000" satisfies string &
    tags.Format<"uuid">;
  const createdAtFrom = "2010-01-01T00:00:00.000Z" satisfies string &
    tags.Format<"date-time">;
  const createdAtTo = "2010-12-31T23:59:59.999Z" satisfies string &
    tags.Format<"date-time">;
  const requestBody = {
    sellerId,
    createdAtFrom,
    createdAtTo,
    page: 1,
    limit: 5,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const safeCheck = (records: IShoppingMallProductSnapshot.ISummary[]) => {
    for (const r of records) {
      TestValidator.equals(
        "snapshot seller filter matches",
        r.snapshot_seller_id,
        sellerId,
      );
      TestValidator.predicate(
        "snapshot created_at within filter window",
        r.created_at >= createdAtFrom && r.created_at <= createdAtTo,
      );
    }
  };
  const page1 = await api.functional.shoppingMall.admin.productSnapshots.search(
    adminConnection,
    { body: requestBody },
  );
  typia.assert(page1);
  if (page1.data.length === 0) {
    TestValidator.equals("records empty on page 1", page1.data.length, 0);
  } else {
    safeCheck(page1.data);
  }
  const page2Body = {
    ...requestBody,
    page: 2,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const page2 = await api.functional.shoppingMall.admin.productSnapshots.search(
    adminConnection,
    { body: page2Body },
  );
  typia.assert(page2);
  if (page2.data.length === 0) {
    TestValidator.equals("records empty on page 2", page2.data.length, 0);
  } else {
    safeCheck(page2.data);
  }
}
