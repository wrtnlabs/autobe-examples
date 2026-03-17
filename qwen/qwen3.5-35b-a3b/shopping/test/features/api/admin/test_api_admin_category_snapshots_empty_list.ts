import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_category_snapshots_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Retrieve snapshots for a randomly generated category ID
  // Using typia.random since we cannot create categories without creation endpoint
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const result =
    await api.functional.ecommerceMall.admin.categories.snapshots.index(
      adminConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination records count",
    result.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", result.pagination.pages, 0);
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  // 4. Validate data array is empty
  TestValidator.equals("snapshot data array is empty", result.data, []);
  // 5. Verify no error returned - empty snapshots is valid state
  TestValidator.predicate("no error for category without snapshots", true);
}
