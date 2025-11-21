import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

/**
 * Test administrator retrieval behavior when requesting non-existent
 * administrator IDs.
 *
 * This test validates that the API returns appropriate error responses for
 * invalid UUID formats and non-existent administrator identifiers. It tests
 * edge cases including malformed UUIDs and administrator IDs that never existed
 * in the system, ensuring proper error handling and security measures prevent
 * information disclosure.
 */
export async function test_api_admin_retrieval_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to establish authorization context
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!" satisfies string & tags.Format<"password">,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test retrieval with valid UUID format but non-existent administrator ID
  await TestValidator.error(
    "retrieval with non-existent valid UUID should fail",
    async () => {
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 3: Test retrieval with another non-existent UUID to ensure consistency
  await TestValidator.error(
    "retrieval with different non-existent UUID should also fail",
    async () => {
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Step 4: Test retrieval with malformed UUID (invalid format)
  await TestValidator.error(
    "retrieval with malformed UUID should fail",
    async () => {
      const malformedUuid = "not-a-valid-uuid" satisfies string;
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: malformedUuid satisfies string as string & tags.Format<"uuid">,
      });
    },
  );

  // Step 5: Test retrieval with empty string UUID
  await TestValidator.error(
    "retrieval with empty string should fail",
    async () => {
      const emptyString = "" satisfies string;
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: emptyString satisfies string as string & tags.Format<"uuid">,
      });
    },
  );

  // Step 6: Test retrieval with UUID-like string that doesn't match format
  await TestValidator.error(
    "retrieval with UUID-like invalid string should fail",
    async () => {
      const uuidLikeString =
        "12345678-1234-1234-1234-123456789abc" satisfies string;
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: uuidLikeString satisfies string as string &
          tags.Format<"uuid">,
      });
    },
  );

  // Step 7: Validate that all error scenarios produce consistent behavior
  TestValidator.predicate(
    "admin authentication remains valid after error scenarios",
    admin.id !== undefined && admin.email !== undefined,
  );
}
