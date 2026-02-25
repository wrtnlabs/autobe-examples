import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_discussion_board_guest_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random guest ID through simulate mode (guaranteed valid for simulation)
  const simulatedGuest = await api.functional.discussionBoard.guests.at(
    guestConnection,
    {
      guestId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // Assert full response is valid according to IDiscussionBoardGuest
  typia.assert(simulatedGuest);
  // Call the actual at API with the simulated ID to retrieve guest
  const output = await api.functional.discussionBoard.guests.at(
    guestConnection,
    {
      guestId: simulatedGuest.id,
    },
  );
  typia.assert(output);
  // Check basic fields for strict equality
  TestValidator.equals("guest ID", output.id, simulatedGuest.id);
  TestValidator.equals(
    "device fingerprint",
    output.deviceFingerprint,
    simulatedGuest.deviceFingerprint,
  );
  TestValidator.equals(
    "user agent",
    output.userAgent,
    simulatedGuest.userAgent,
  );
  TestValidator.equals(
    "IP address",
    output.ipAddress,
    simulatedGuest.ipAddress,
  );
  TestValidator.equals(
    "anonymous ID",
    output.anonymousId,
    simulatedGuest.anonymousId,
  );
  // Timestamps are properly formatted and validated by typia.assert
  // deletedAt can be null or a date string, typia.assert verifies this
}
