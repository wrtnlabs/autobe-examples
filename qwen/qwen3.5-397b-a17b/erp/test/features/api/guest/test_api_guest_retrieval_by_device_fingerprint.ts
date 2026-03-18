import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieval_by_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for guest retrieval
  const guestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Retrieve guest record by device fingerprint
  const guest: IHrmPlatformGuest = await api.functional.hrmPlatform.guests.at(
    connection,
    {
      guestId: guestId,
    },
  );
  // Validate complete response structure including all nested session objects
  typia.assert(guest);
  // Validate business logic: session guest_id references match the parent guest id
  if (guest.sessions.length > 0) {
    guest.sessions.forEach((session: IHrmPlatformGuestSession) => {
      TestValidator.equals(
        "session guest_id references parent guest",
        session.guest_id,
        guest.id,
      );
    });
  }
}
