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

export async function test_api_admin_category_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve snapshots for a category using admin connection
  // adminConnection.headers is automatically updated by authorize_admin_join
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const snapshotsResponse =
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
  typia.assert(snapshotsResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 4. Validate snapshot data structure
  typia.assert(snapshotsResponse.data);
  for (const snapshot of snapshotsResponse.data) {
    // snapshotId should match the requested categoryId
    TestValidator.equals(
      "snapshot snapshotId matches categoryId",
      snapshot.snapshotId,
      categoryId,
    );
    // Validate required fields are non-empty strings
    TestValidator.notEquals("snapshot code is not empty", snapshot.code, "");
    TestValidator.notEquals("snapshot name is not empty", snapshot.name, "");
    TestValidator.notEquals("snapshot slug is not empty", snapshot.slug, "");
    // Validate numeric fields are non-negative
    TestValidator.predicate(
      "snapshot level is non-negative",
      snapshot.level >= 0,
    );
    TestValidator.predicate(
      "snapshot sortOrder is non-negative",
      snapshot.sortOrder >= 0,
    );
  }
}