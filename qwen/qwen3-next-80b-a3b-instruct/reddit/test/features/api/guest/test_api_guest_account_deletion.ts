import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
export async function test_api_guest_account_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random guest session using typia.random
  const guest: ICommunityPlatformGuest =
    typia.random<ICommunityPlatformGuest>();
  // Call the erase endpoint to delete the guest account
  const deletedGuest: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guests.erase(connection, {
      guestId: guest.id,
    });
  // Validate that the returned guest data matches the original guest
  typia.assert(deletedGuest);
  TestValidator.equals("deleted guest ID matches", deletedGuest.id, guest.id);
  // Validate idempotency: delete again with same ID should not error
  const secondDelete: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guests.erase(connection, {
      guestId: guest.id,
    });
  typia.assert(secondDelete);
  TestValidator.equals(
    "second delete returns same guest ID",
    secondDelete.id,
    guest.id,
  );
}
