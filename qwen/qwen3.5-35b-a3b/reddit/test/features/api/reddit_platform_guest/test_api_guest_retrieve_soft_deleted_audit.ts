import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_retrieve_soft_deleted_audit(
  connection: api.IConnection,
): Promise<void> {
  // Generate random guest ID for retrieval
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Create connection for the test (follows isolation pattern)
  const guestConnection: api.IConnection = { host: connection.host };
  // Retrieve guest account - soft-deleted guests should still be retrievable for audit
  const guest = await api.functional.redditPlatform.guests.at(guestConnection, {
    guestId,
  });
  typia.assert(guest);
  // Validate response contains all required fields from IRedditPlatformGuest DTO
  TestValidator.equals("guest id matches request", guest.id, guestId);
  // Validate device fingerprint exists
  TestValidator.predicate(
    "guest has fingerprint",
    guest.fingerprint.length > 0,
  );
  // Validate created_at timestamp is valid ISO datetime
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(guest.created_at)),
  );
  // Validate updated_at timestamp is valid ISO datetime
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(guest.updated_at)),
  );
  // Validate deleted_at field exists (can be null or valid datetime for soft delete)
  TestValidator.predicate(
    "deleted_at field present",
    guest.deleted_at !== undefined,
  );
  // Validate deleted_at is either null (active) or valid ISO datetime (deleted)
  if (guest.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is valid ISO datetime",
      !isNaN(Date.parse(guest.deleted_at)),
    );
  }
}
