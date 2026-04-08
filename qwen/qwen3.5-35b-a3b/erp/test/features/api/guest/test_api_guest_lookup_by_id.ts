import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_lookup_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test successful guest lookup with a valid UUID
  const validGuestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const guestResponse = await api.functional.hrmPlatform.guests.at(connection, {
    guestId: validGuestId,
  });
  typia.assert(guestResponse);
  // 2. Validate response contains all required fields
  TestValidator.equals(
    "guest id matches requested id",
    guestResponse.id,
    validGuestId,
  );
  TestValidator.predicate(
    "device identifier is present",
    guestResponse.device_identifier.length > 0,
  );
  TestValidator.predicate(
    "ip address is present",
    guestResponse.ip_address.length > 0,
  );
  TestValidator.predicate(
    "user agent is present",
    guestResponse.user_agent.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 datetime",
    guestResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 datetime",
    guestResponse.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active guest",
    guestResponse.deleted_at,
    null,
  );
  // 3. Test 404 for non-existent guest
  const nonExistentGuestId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "should return 404 for non-existent guest",
    404,
    async () => {
      await api.functional.hrmPlatform.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
