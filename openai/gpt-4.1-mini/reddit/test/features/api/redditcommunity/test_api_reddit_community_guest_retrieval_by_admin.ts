import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";

/**
 * Test retrieval of detailed redditCommunity guest information by admin role.
 *
 * This test authenticates an admin user via join, then attempts to retrieve
 * guest details by guest ID, validating secure access. Only admins can view
 * guest metadata such as session_id, IP address, and user_agent.
 *
 * Due to lack of guest creation API, valid guest retrieval is skipped, but
 * error handling for non-existent guest IDs is verified.
 *
 * Validations rely on typia.assert for type guarantees. Error scenarios ensure
 * proper failure on invalid guest IDs.
 *
 * @param connection API connection to use for calls.
 */
export async function test_api_reddit_community_guest_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securepassword123",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Test retrieval with invalid/non-existent guest ID
  const invalidGuestId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieval fails with non-existent guest ID",
    async () => {
      await api.functional.redditCommunity.admin.redditCommunityGuests.at(
        connection,
        {
          id: invalidGuestId,
        },
      );
    },
  );
}
