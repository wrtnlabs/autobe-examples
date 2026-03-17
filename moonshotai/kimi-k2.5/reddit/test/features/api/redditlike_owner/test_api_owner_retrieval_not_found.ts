import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_owner_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentOwnerId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 Not Found when retrieving non-existent owner
  await TestValidator.httpError(
    "should return 404 for non-existent owner",
    404,
    async () => {
      await api.functional.redditLike.owners.at(connection, {
        ownerId: nonExistentOwnerId,
      });
    },
  );
}
