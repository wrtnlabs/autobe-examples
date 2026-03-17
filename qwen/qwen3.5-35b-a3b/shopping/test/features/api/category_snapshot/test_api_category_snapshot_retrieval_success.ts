import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(admin);
  // 2. Generate random category and snapshot IDs
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve category snapshot using SDK
  const snapshot: IEcommerceMallCategorySnapshot =
    await api.functional.ecommerceMall.admin.categories.snapshots.at(
      adminConnection,
      {
        categoryId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic: snapshot_id matches requested snapshotId
  TestValidator.equals(
    "snapshot_id matches requested ID",
    snapshot.snapshot_id,
    snapshotId,
  );
  // 5. Validate business logic: category relationship is loaded
  TestValidator.predicate(
    "category name is non-empty string",
    snapshot.category.name.length > 0,
  );
  TestValidator.predicate(
    "category slug is non-empty string",
    snapshot.category.slug.length > 0,
  );
  // 6. Validate hierarchy: level is positive integer
  TestValidator.predicate("level is positive integer", snapshot.level > 0);
  // 7. Validate hierarchy: sort_order is non-negative
  TestValidator.predicate(
    "sort_order is non-negative",
    snapshot.sort_order >= 0,
  );
  // 8. Validate hierarchy: parent_id is null for root categories (level 1)
  if (snapshot.level === 1) {
    TestValidator.equals(
      "root category has no parent",
      snapshot.parent_id,
      null,
    );
  }
  // 9. Validate timestamp is reasonable (not epoch, not future beyond 1 year)
  const createdAt = new Date(snapshot.created_at);
  const now = new Date();
  TestValidator.predicate("created_at is valid date", createdAt.getTime() > 0);
  TestValidator.predicate(
    "created_at is not future dated",
    createdAt.getTime() <= now.getTime() + 1000 * 60 * 60 * 24 * 365,
  );
  // 10. Validate category relationship matches snapshot reference
  TestValidator.equals(
    "category id matches snapshot reference",
    snapshot.category.id,
    snapshot.snapshot_id,
  );
}