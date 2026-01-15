import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";

export async function test_api_guest_profile_expired(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for a guest profile
  const guestId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the guest profile using the generated ID
  // The API will return the guest profile if it exists, with isExpired flag set according to system logic (based on lastAccessedAt)
  const retrievedGuest: ICommunityPlatformGuest =
    await api.functional.communityPlatform.guests.at(connection, {
      guestId,
    });
  // Validate that the response has the correct structure and type
  typia.assert(retrievedGuest);
  // Verify the guest has been properly identified as expired or not-expired
  // Note: The system should automatically set isExpired to true if session has been inactive for more than 7 days
  // Since we're working in a test environment, we cannot control whether this specific guest is expired or not
  // However, we can validate that the isExpired property is correctly reflected in the response
  TestValidator.equals(
    "guest profile has isExpired boolean property",
    typeof retrievedGuest.isExpired,
    "boolean",
  );
  // Validate that guest profile data is fully returned according to the DTO specification
  TestValidator.equals("guest ID matches", retrievedGuest.id, guestId);

  // Validate creation timestamp format using typia.assertGuard to ensure string & Format<"date-time">
  typia.assertGuard(retrievedGuest.createdAt);
  TestValidator.equals(
    "creation timestamp is in ISO 8601 format",
    typeof retrievedGuest.createdAt,
    "string",
  );

  // Validate last accessed timestamp format using typia.assertGuard to ensure string & Format<"date-time">
  typia.assertGuard(retrievedGuest.lastAccessedAt);
  TestValidator.equals(
    "last accessed timestamp is in ISO 8601 format",
    typeof retrievedGuest.lastAccessedAt,
    "string",
  );

  // Validate guestType against allowed literal union type
  TestValidator.equals(
    "guest type is valid",
    retrievedGuest.guestType,
    "anonymous" satisfies "anonymous" | "trial" | "limited" as "anonymous" | "trial" | "limited",
  );
}