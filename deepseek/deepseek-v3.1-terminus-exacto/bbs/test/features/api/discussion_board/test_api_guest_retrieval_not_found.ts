import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection specifically for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that doesn't exist in the system
  const nonExistentGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent guest account
  await TestValidator.httpError(
    "retrieving non-existent guest should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.guests.at(guestConnection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
