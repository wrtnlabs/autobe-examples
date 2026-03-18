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

export async function test_api_product_snapshots_admin_pagination_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // Admin actor connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  const limit = 2 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1Req = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const page1 = await api.functional.shoppingMall.admin.productSnapshots.search(
    adminConnection,
    {
      body: page1Req,
    },
  );
  typia.assert(page1);
  const page2Req = {
    page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const page2 = await api.functional.shoppingMall.admin.productSnapshots.search(
    adminConnection,
    {
      body: page2Req,
    },
  );
  typia.assert(page2);
  const records = page1.pagination.records;
  const expectedNonEmptyPage2 = records > limit;
  if (expectedNonEmptyPage2) {
    TestValidator.predicate(
      "page2 has non-empty data when records exceed limit",
      page2.data.length > 0,
    );
  }
  const toMs = (iso: string) => new Date(iso).getTime();
  const createdAtsPage1 = page1.data.map((x) => x.created_at);
  const createdAtsPage2 = page2.data.map((x) => x.created_at);
  for (let i = 1; i < createdAtsPage1.length; i++) {
    TestValidator.predicate(
      "page1 created_at sorted desc",
      toMs(createdAtsPage1[i - 1]) >= toMs(createdAtsPage1[i]),
    );
  }
  for (let i = 1; i < createdAtsPage2.length; i++) {
    TestValidator.predicate(
      "page2 created_at sorted desc",
      toMs(createdAtsPage2[i - 1]) >= toMs(createdAtsPage2[i]),
    );
  }
  if (expectedNonEmptyPage2 && page1.data.length > 0 && page2.data.length > 0) {
    const lastOnPage1 = page1.data[page1.data.length - 1].created_at;
    const firstOnPage2 = page2.data[0].created_at;
    TestValidator.predicate(
      "default created_at DESC across pages",
      toMs(lastOnPage1) >= toMs(firstOnPage2),
    );
  }
  // Read-only inference: repeated call should yield same record count during test window
  const page1Repeat =
    await api.functional.shoppingMall.admin.productSnapshots.search(
      adminConnection,
      {
        body: page1Req,
      },
    );
  typia.assert(page1Repeat);
  TestValidator.equals(
    "records count stable",
    page1Repeat.pagination.records,
    page1.pagination.records,
  );
}
