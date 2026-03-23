import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_department_retrieval_top_level(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random department ID for testing retrieval
  const departmentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve department using the API
  const department = await api.functional.hrmTracker.departments.at(
    connection,
    {
      departmentId,
    },
  );
  typia.assert(department);
  // Validate department properties
  TestValidator.equals("has valid ID format", department.id.length, 36);
  TestValidator.predicate("has name", department.name !== "");
  TestValidator.predicate("parent is null", department.parent === null);
  TestValidator.equals("children_count is 0", department.children_count, 0);
  TestValidator.predicate("has valid timestamps", () => {
    const created = new Date(department.created_at);
    const updated = new Date(department.updated_at);
    return !isNaN(created.getTime()) && !isNaN(updated.getTime());
  });
}
