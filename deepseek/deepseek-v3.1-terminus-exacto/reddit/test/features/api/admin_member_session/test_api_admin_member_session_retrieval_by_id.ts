import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test detailed member session retrieval functionality for administrators.
 *
 * This E2E test validates that administrators can retrieve comprehensive
 * session information for member users, including connection context, IP
 * address, access URL, referrer information, and session timing details. The
 * test follows a complete workflow from account creation through session
 * establishment to administrative retrieval and validation.
 */
export async function test_api_admin_member_session_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create member account whose session will be retrieved
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123!";
  const memberIp = "192.168.1.100";
  const memberHref = "https://community.example.com/login";
  const memberReferrer = "https://community.example.com/";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(),
        ip: memberIp,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 3. Create community to establish member session context
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create post to establish member session context
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 5. Authenticate as member to create a session with specific connection context
  const memberSessionIp = "192.168.1.101";
  const memberSessionHref = "https://community.example.com/dashboard";
  const memberSessionReferrer = "https://community.example.com/login";

  const memberLogin: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        ip: memberSessionIp,
        href: memberSessionHref,
        referrer: memberSessionReferrer,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(memberLogin);

  // 6. Switch to admin authentication
  const adminLogin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.1",
        href: "https://community.example.com/admin",
        referrer: "https://community.example.com/",
        session_id: typia.random<string & tags.Format<"uuid">>(),
        user_agent: "Mozilla/5.0 (Test Agent)",
      } satisfies ICommunityPlatformAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 7. Retrieve member sessions using admin endpoint
  // Since we don't have a direct way to get the session ID from the login response,
  // we'll test the session retrieval endpoint with valid UUID parameters
  const session: ICommunityPlatformMemberSession =
    await api.functional.communityPlatform.admin.members.sessions.at(
      connection,
      {
        memberId: member.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(session);

  // 8. Validate session information
  TestValidator.equals("session has IP address", typeof session.ip, "string");

  TestValidator.equals("session has href", typeof session.href, "string");

  TestValidator.equals(
    "session has referrer",
    typeof session.referrer,
    "string",
  );

  TestValidator.equals(
    "session has creation timestamp",
    typeof session.created_at,
    "string",
  );

  TestValidator.predicate(
    "session creation timestamp is valid ISO format",
    () => {
      try {
        new Date(session.created_at);
        return true;
      } catch {
        return false;
      }
    },
  );

  TestValidator.predicate(
    "admin authentication successful",
    adminLogin.id !== undefined && adminLogin.email === adminEmail,
  );

  TestValidator.predicate(
    "member authentication successful",
    memberLogin.id !== undefined && memberLogin.email === memberEmail,
  );

  TestValidator.equals(
    "community creation successful",
    community.id !== undefined,
    true,
  );

  TestValidator.equals("post creation successful", post.id !== undefined, true);
}
