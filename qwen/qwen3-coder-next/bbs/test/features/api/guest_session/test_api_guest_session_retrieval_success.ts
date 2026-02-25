import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a guest session first
  const guest = typia.random<IDiscussionBoardGuest>();
  // Retrieve the guest session using the API
  const retrievedGuest = await api.functional.discussionBoard.guests.at(
    connection,
    {
      guestId: guest.id,
    },
  );
  // Validate the retrieved guest session
  typia.assert(retrievedGuest);
  // Verify the retrieved guest matches the created guest
  TestValidator.equals("guest ID matches", retrievedGuest.id, guest.id);
  TestValidator.equals(
    "IP address matches",
    retrievedGuest.ip_address,
    guest.ip_address,
  );
  TestValidator.equals(
    "device fingerprint matches",
    retrievedGuest.device_fingerprint,
    guest.device_fingerprint,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedGuest.created_at,
    guest.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedGuest.updated_at,
    guest.updated_at,
  );
}
