import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Generate category and snapshot IDs for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = `${categoryId}-snapshot-${Date.now()}`;
  // 3. Retrieve the snapshot
  const snapshot =
    await api.functional.ecommerceMall.administrator.categories.snapshots.at(
      connection,
      {
        categoryId,
        snapshotId: snapshotId as string & tags.Format<"uuid">,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure and fields
  TestValidator.equals(
    "entity_type is category",
    snapshot.entity_type,
    "category",
  );
  TestValidator.equals("category id matches", snapshot.entity_id, categoryId);
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.predicate("snapshot name exists", snapshot.name.length > 0);
  TestValidator.predicate(
    "snapshot description exists",
    snapshot.description !== null,
  );
  TestValidator.predicate(
    "created_at is valid",
    snapshot.created_at !== undefined,
  );
  TestValidator.predicate("category exists", snapshot.category !== null);
  TestValidator.equals("category id present", snapshot.category.id, categoryId);
  TestValidator.predicate(
    "category name present",
    snapshot.category.name.length > 0,
  );
  TestValidator.predicate("modifiedBy exists", snapshot.modifiedBy !== null);
  TestValidator.equals(
    "modifiedBy id present",
    snapshot.modifiedBy.id,
    admin.id,
  );
}
