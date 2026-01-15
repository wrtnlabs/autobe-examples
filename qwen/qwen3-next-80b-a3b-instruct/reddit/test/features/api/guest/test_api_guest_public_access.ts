import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
export async function test_api_guest_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Call the public guest endpoint without authentication
  const guestData: ICommunityPlatformGuest.ISummary =
    await api.functional.guest.index(connection);
  // Validate the response structure with typia.assert for complete type safety
  typia.assert(guestData);
  // Verify all required properties exist and have correct types through typia.assert
  // No additional validation is needed as typia.assert covers all schema constraints
  // This includes UUID format for session_id, date-time format for timestamps,
  // Max length for user_agent, ISO 3166-1 alpha-2 format for location_country,
  // integer types for session_duration and page_views, boolean for is_bot and is_active,
  // and proper enum for device_type
}
