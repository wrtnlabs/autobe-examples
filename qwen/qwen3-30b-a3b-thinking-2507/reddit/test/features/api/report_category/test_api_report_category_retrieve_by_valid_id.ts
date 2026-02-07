import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_report_category_retrieve_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  const id = typia.random<string & tags.Format<"uuid">>();
  const category = await api.functional.communityPlatform.report_categories.at(
    connection,
    { id },
  );
  typia.assert(category);
  TestValidator.equals("id matches generated value", category.id, id);
  TestValidator.predicate(
    "name is present and non-empty",
    category.name.length > 0,
  );
  TestValidator.equals(
    "description matches expected value",
    category.description,
    category.description,
  );
  TestValidator.equals(
    "created_at is valid",
    category.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at is valid",
    category.updated_at.length > 0,
    true,
  );
}
