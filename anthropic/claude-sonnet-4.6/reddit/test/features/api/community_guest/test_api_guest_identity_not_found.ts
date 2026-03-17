import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_identity_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without any authentication (guests are unauthenticated)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that does not correspond to any existing guest record
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();
  // Assert that calling the endpoint with a non-existent UUID returns a 404 error
  await TestValidator.httpError("guest identity not found", 404, async () => {
    await api.functional.community.guests.at(guestConnection, {
      guestId: nonExistentGuestId,
    });
  });
}
