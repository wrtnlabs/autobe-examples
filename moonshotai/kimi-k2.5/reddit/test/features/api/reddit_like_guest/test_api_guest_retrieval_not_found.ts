import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the system
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 Not Found when trying to retrieve non-existent guest
  await TestValidator.httpError(
    "should return 404 for non-existent guest",
    404,
    async () => {
      await api.functional.redditLike.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
