import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_account_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID to test with
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent guest account
  // This should return 404 Not Found, validating the soft-delete filter works correctly
  await TestValidator.httpError(
    "non-existent (soft-deleted) guest should return 404",
    [404],
    async () => {
      const guest = await api.functional.redditCommunity.guests.at(connection, {
        guestId,
      });
      typia.assert(guest);
    },
  );
}
