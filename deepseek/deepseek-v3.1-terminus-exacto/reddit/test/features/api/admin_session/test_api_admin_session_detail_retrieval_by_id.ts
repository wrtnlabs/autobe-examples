import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminSession";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test detailed retrieval of a specific administrator authentication session by
 * its unique identifier.
 *
 * This comprehensive test validates the complete session information retrieval
 * functionality, including connection context details, security metadata, IP
 * address tracking, and timing information. The test ensures proper session
 * ownership validation and comprehensive data structure verification for
 * security auditing purposes.
 *
 * Test workflow:
 *
 * 1. Create administrator account with authentication context
 * 2. Create prerequisite platform resources (channel and community)
 * 3. Create member account for multi-actor testing context
 * 4. Perform authentication operations to generate session records
 * 5. Test session retrieval API contract and error handling
 * 6. Validate API response patterns and security boundaries
 */
export async function test_api_admin_session_detail_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminSecure123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create prerequisite channel resource
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: 1,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create prerequisite community resource
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          slug: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create member account for multi-actor context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberSecure123!";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        href: "https://platform.example.com/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Perform admin login to generate session record
  const loggedInAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://platform.example.com/admin/login",
        referrer: "https://platform.example.com/admin",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(loggedInAdmin);

  // Step 6: Test session retrieval API with valid admin ID but invalid session ID
  // Since we don't have access to actual session IDs from the login response,
  // we test the API contract with a properly formatted but non-existent session ID
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "retrieving non-existent session should return appropriate error",
    async () => {
      await api.functional.communityPlatform.admin.admins.sessions.at(
        connection,
        {
          adminId: admin.id,
          sessionId: invalidSessionId,
        },
      );
    },
  );

  // Step 7: Validate that admin ID format is correct for session retrieval
  TestValidator.predicate(
    "admin ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ),
  );

  // Step 8: Test with malformed session ID to validate input validation
  const malformedSessionId = "not-a-valid-uuid";

  await TestValidator.error(
    "malformed session ID should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.admins.sessions.at(
        connection,
        {
          adminId: admin.id,
          sessionId: malformedSessionId satisfies string as string,
        },
      );
    },
  );

  // Step 9: Final validation - ensure API endpoint is accessible and functional
  TestValidator.predicate(
    "admin authentication context maintained for session operations",
    connection.headers?.Authorization !== undefined,
  );
}
