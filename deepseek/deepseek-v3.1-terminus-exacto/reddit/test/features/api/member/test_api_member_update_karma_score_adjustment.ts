import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test karma score adjustment workflow where administrator modifies member
 * reputation score based on community contributions. This scenario validates
 * that karma score updates follow proper business rules, including minimum
 * value constraints and proper persistence.
 */
export async function test_api_member_update_karma_score_adjustment(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: "Test Administrator",
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account with initial karma score
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: "Test Member",
        ip: "192.168.1.1",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.equals(
    "initial karma score should be 0",
    member.karma_score,
    0,
  );

  // Step 3: Create community using member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/community",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          slug: "test-community",
          description: "A test community for karma score validation",
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch back to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Update member karma score with positive adjustment
  const updatedMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: {
        karma_score: 50,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(updatedMember);
  TestValidator.equals(
    "karma score should be updated to 50",
    updatedMember.karma_score,
    50,
  );

  // Step 6: Update member karma score with minimum value constraint
  const minKarmaMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: {
        karma_score: 0,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(minKarmaMember);
  TestValidator.equals(
    "karma score should be updated to 0",
    minKarmaMember.karma_score,
    0,
  );

  // Step 7: Test concurrent updates (display_name and karma_score)
  const concurrentUpdateMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: {
        display_name: "Updated Test Member",
        karma_score: 100,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(concurrentUpdateMember);
  TestValidator.equals(
    "display name should be updated",
    concurrentUpdateMember.display_name,
    "Updated Test Member",
  );
  TestValidator.equals(
    "karma score should be updated to 100",
    concurrentUpdateMember.karma_score,
    100,
  );

  // Step 8: Validate persistence by performing another update and checking consistency
  const finalUpdateMember: ICommunityPlatformMember.ISummary =
    await api.functional.communityPlatform.admin.members.update(connection, {
      memberId: member.id,
      body: {
        karma_score: 75,
      } satisfies ICommunityPlatformMember.IUpdate,
    });
  typia.assert(finalUpdateMember);
  TestValidator.equals(
    "display name should persist from previous update",
    finalUpdateMember.display_name,
    "Updated Test Member",
  );
  TestValidator.equals(
    "karma score should be updated to 75",
    finalUpdateMember.karma_score,
    75,
  );

  // Step 9: Test error scenario - member trying to update their own karma (should fail)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "member should not be able to update karma score",
    async () => {
      await api.functional.communityPlatform.admin.members.update(connection, {
        memberId: member.id,
        body: {
          karma_score: 200,
        } satisfies ICommunityPlatformMember.IUpdate,
      });
    },
  );
}
