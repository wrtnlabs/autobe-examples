import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_guest_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test checks the API response when querying a non-existent guestId.
  // The endpoint should return 404 HTTP error indicating guest not found.
  // Prepare a non-existing UUID for guestId
  const nonExistingGuestId = typia.random<string & tags.Format<"uuid">>();
  // Call the guest retrieval endpoint with the non-existing guestId
  // Expect an HTTP error with status 404
  await TestValidator.httpError(
    "guest not found returns 404",
    404,
    async () => {
      // Use the SDK function to call the GET /discussionBoard/guests/{guestId} endpoint
      await api.functional.discussionBoard.guests.at(connection, {
        guestId: nonExistingGuestId,
      });
    },
  );
}
