import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_account_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that is guaranteed to not exist in the system
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create a connection for the test (no authentication required for this endpoint)
  const testConnection: api.IConnection = { host: connection.host };
  // Attempt to fetch the non-existent guest and validate 404 error
  await TestValidator.httpError(
    "non-existent guest returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.guests.at(testConnection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
