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

export async function test_api_category_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create authenticated connection using admin token
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${admin.token.access}`,
    },
  };
  // 3. Retrieve category snapshots with default pagination parameters
  const response: IPageIEcommerceMallCategorySnapshot.ISummary =
    await api.functional.ecommerceMall.category_snapshots.index(
      adminAuthConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "snapshot_created_at",
          order: "desc",
        } satisfies IEcommerceMallCategorySnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page field",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit field",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // 5. Validate pagination consistency
  TestValidator.predicate(
    "pages count matches records and limit",
    response.pagination.pages === 0
      ? true
      : response.pagination.pages ===
          Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 6. Validate sorting: snapshots sorted by snapshot_created_at in descending order
  if (response.data.length > 1) {
    let isSorted = true;
    for (let i = 1; i < response.data.length; i++) {
      const prevDate = new Date(response.data[i - 1].snapshot_created_at);
      const currDate = new Date(response.data[i].snapshot_created_at);
      if (prevDate.getTime() < currDate.getTime()) {
        isSorted = false;
        break;
      }
    }
    TestValidator.predicate(
      "snapshots are sorted by snapshot_created_at descending",
      isSorted,
    );
  }
  // 7. Validate pagination metadata reflects actual data count
  TestValidator.predicate(
    "data count matches or is less than records",
    response.data.length <= response.pagination.records ||
      response.pagination.records === 0,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    response.data.length <= response.pagination.limit ||
      response.pagination.records === 0,
  );
}
