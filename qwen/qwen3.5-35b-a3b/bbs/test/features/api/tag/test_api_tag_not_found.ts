import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that doesn't exist in the database
  const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent tag
  // This should return 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existent tag",
    [404],
    async () => {
      return await api.functional.economicPoliticalBoard.tags.at(
        userConnection,
        {
          tagId: nonExistentTagId,
        },
      );
    },
  );
}
