import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reviews_list_newest_first_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const page = 1;
  const limit = 5;
  // 2) List reviews
  const output = await api.functional.shoppingMall.admin.reviews.index(
    adminConnection,
    {
      body: {
        page,
        limit,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(output);
  // 3) Validate pagination metadata
  TestValidator.equals("pagination current", output.pagination.current, page);
  TestValidator.equals("pagination limit", output.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records >= page data length",
    output.pagination.records >= output.data.length,
  );
  const expectedPages = Math.ceil(output.pagination.records / limit);
  TestValidator.equals(
    "pagination pages consistent",
    output.pagination.pages,
    expectedPages,
  );
  TestValidator.predicate("data length <= limit", output.data.length <= limit);
  // 4) Newest-first ordering check (updatedAt DESC, then createdAt DESC)
  const toTime = (iso: string) => new Date(iso).getTime();
  for (let i = 1; i < output.data.length; i++) {
    const prev = output.data[i - 1];
    const curr = output.data[i];
    const prevUpdated = toTime(prev.updatedAt);
    const currUpdated = toTime(curr.updatedAt);
    const okUpdated = prevUpdated >= currUpdated;
    const okTie =
      prevUpdated === currUpdated &&
      toTime(prev.createdAt) >= toTime(curr.createdAt);
    TestValidator.predicate(
      `newest-first ordering at index ${i}`,
      okUpdated || okTie,
    );
  }
}
