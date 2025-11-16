import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test member access to rules in a private community that they are not a member
 * of. This scenario validates proper authorization boundaries by ensuring
 * members cannot access rules in private communities they don't belong to,
 * testing the security isolation between communities.
 */
export async function test_api_member_rule_access_private_community(
  connection: api.IConnection,
) {
  // Step 1: Create member who will attempt rule access (unauthorized member)
  const unauthorizedMemberEmail = typia.random<string & tags.Format<"email">>();
  const unauthorizedMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: unauthorizedMemberEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(unauthorizedMember);

  // Step 2: Create different member who creates private community (community creator)
  const communityCreatorEmail = typia.random<string & tags.Format<"email">>();
  const communityCreator = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: communityCreatorEmail,
      password: "TestPassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(communityCreator);

  // Step 3: Create community moderator for private community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: "TestPassword123!",
        nickname: RandomGenerator.name(),
        href: "https://reddit-community.com",
        referrer: "https://reddit-community.com/login",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 4: Community creator creates private community
  // Switch to community creator context
  await api.functional.auth.member.login(connection, {
    body: {
      email: communityCreatorEmail,
      password: "TestPassword123!",
      href: "https://reddit-community.com",
      referrer: "https://reddit-community.com/login",
      ip: "192.168.1.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const privateCommunity =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: `private_community_${RandomGenerator.alphaNumeric(8)}`,
        title: "Private Test Community",
        description: "A private community for testing rule access restrictions",
        category_name: "Technology",
        type: "private",
        post_requirement_min_age: 30,
        post_requirement_min_karma: 50,
        allow_crosspost: false,
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(privateCommunity);
  TestValidator.equals(
    "community type should be private",
    privateCommunity.type,
    "private",
  );

  // Step 5: Moderator creates rule within private community
  // Switch to moderator context
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://reddit-community.com",
      referrer: "https://reddit-community.com/login",
      ip: "192.168.1.1",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const communityRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.create(
      connection,
      {
        communityName: privateCommunity.name,
        body: {
          title: "Be Respectful",
          description:
            "Always maintain respectful communication with other community members.",
          violation_consequence:
            "Warning followed by temporary suspension for repeated violations",
        } satisfies IRedditCommunityCommunityRule.ICreate,
      },
    );
  typia.assert(communityRule);

  // Step 6: Unauthorized member attempts to access rule in private community
  // Switch back to unauthorized member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: unauthorizedMemberEmail,
      password: "TestPassword123!",
      href: "https://reddit-community.com",
      referrer: "https://reddit-community.com/login",
      ip: "192.168.1.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Attempt to access the rule - this should fail due to unauthorized access to private community
  await TestValidator.error(
    "unauthorized member cannot access rules in private community",
    async () => {
      await api.functional.redditCommunity.member.communities.rules.at(
        connection,
        {
          communityName: privateCommunity.name,
          ruleId: communityRule.id,
        },
      );
    },
  );
}
