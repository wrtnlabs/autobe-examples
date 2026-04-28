import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member profile retrieval with non-existent member ID.
 *
 * Validates that the API returns a 404 Not Found response when attempting to retrieve a member profile that does not exist in the database. Uses a valid UUID format for the member ID to ensure the request passes format validation but fails at the resource lookup stage.
 *
 * This test verifies proper error handling for missing resources and ensures the system correctly distinguishes between invalid input formats and non-existent resources. The UUID generated is guaranteed to pass type validation but represents a member that doesn't exist.
 *
 * 1. Generate a random UUID that does not correspond to any registered member account.
 * 2. Attempt to retrieve member profile using the endpoint with this non-existent UUID.
 * 3. Validate that the API throws an HttpError with status 404, confirming proper not-found handling.
 */
export async function test_api_member_not_found(connection: api.IConnection) {
  // Create isolated actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate non-existent but valid UUID format member ID
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Validate that API returns 404 for non-existent member
  await TestValidator.httpError(
    "non-existent member returns 404 not found",
    404,
    async () => {
      await api.functional.hrmPlatform.members.at(memberConnection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
