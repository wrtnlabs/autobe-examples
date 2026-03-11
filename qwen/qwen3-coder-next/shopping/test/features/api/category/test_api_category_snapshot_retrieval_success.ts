import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Since no admin category creation/update APIs are provided,
  // we assume the category and snapshot already exist.
  // For testing purposes, we will use a valid categoryId and snapshotId.
  // Retrieve a category snapshot using valid IDs
  // Note: In real scenario, these IDs would come from a pre-existing test setup
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot = await api.functional.ecommerceMall.categories.snapshots.at(
    connection,
    {
      categoryId: validCategoryId,
      snapshotId: validSnapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate snapshot fields according to the scenario
  TestValidator.equals("snapshot type", snapshot.snapshot_type, "edit");
  TestValidator.predicate(
    "before_name exists",
    snapshot.before_name !== null && snapshot.before_name !== undefined,
  );
  TestValidator.predicate(
    "after_name exists",
    snapshot.after_name !== null && snapshot.after_name !== undefined,
  );
  TestValidator.predicate(
    "before_description exists",
    snapshot.before_description !== null &&
      snapshot.before_description !== undefined,
  );
  TestValidator.predicate(
    "after_description exists",
    snapshot.after_description !== null &&
      snapshot.after_description !== undefined,
  );
  TestValidator.predicate(
    "created_at exists",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
