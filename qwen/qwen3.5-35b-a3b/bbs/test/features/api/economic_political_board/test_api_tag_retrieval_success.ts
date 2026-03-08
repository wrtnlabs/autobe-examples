import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid tag UUID using typia.random
  const tagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Make GET request to retrieve tag by UUID
  const response = await api.functional.economicPoliticalBoard.tags.at(
    connection,
    { tagId },
  );
  typia.assert(response);
  // 3. Verify response id matches request tagId
  TestValidator.equals("tag id matches request", response.id, tagId);
  // 4. Verify tag name follows validation pattern ^[a-z0-9-]+$
  TestValidator.predicate(
    "tag name follows pattern ^[a-z0-9-]+$",
    /^[a-z0-9-]+$/.test(response.name),
  );
  // 5. Verify deleted_at is null for active tags
  TestValidator.equals("tag should not be deleted", response.deleted_at, null);
  // 6. Response validation includes all schema fields (id, name, created_at, updated_at, deleted_at)
  // typia.assert(response) above validates all fields including date-time formats
}
