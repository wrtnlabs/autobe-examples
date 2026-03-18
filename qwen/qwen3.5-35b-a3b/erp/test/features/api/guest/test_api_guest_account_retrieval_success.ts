import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_account_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random guest ID for testing
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the guest account (public endpoint, no authentication required)
  const guest = await api.functional.hrms.guests.at(connection, {
    guestId,
  });
  typia.assert(guest);
  // Validate the guest record structure
  TestValidator.equals("guest ID matches", guest.id, guestId);
  // Validate device fingerprint is present
  TestValidator.predicate(
    "device fingerprint is not empty",
    guest.device_fingerprint.length > 0,
  );
  // Validate deleted_at is null for active guest
  TestValidator.equals(
    "active guest has no deletion timestamp",
    guest.deleted_at,
    null,
  );
  // Validate all required fields exist and have correct types
  TestValidator.equals(
    "created_at format valid",
    true,
    typeof guest.created_at === "string",
  );
  TestValidator.equals(
    "updated_at format valid",
    true,
    typeof guest.updated_at === "string",
  );
}
