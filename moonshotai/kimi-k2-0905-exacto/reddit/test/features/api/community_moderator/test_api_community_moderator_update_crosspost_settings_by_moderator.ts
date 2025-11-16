import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";

/**
 * Test that a community moderator can toggle crossposting permissions to
 * control content sharing capabilities. Validates permission changes affect
 * whether content can be crossposted from other communities.
 */
export async function test_api_community_moderator_update_crosspost_settings_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create member user for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "securePassword123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create community moderator user
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        nickname: RandomGenerator.name(),
        email: moderatorEmail,
        password: "securePassword123",
        href: "https://reddit-community.local",
        referrer: "https://reddit-community.local/signup",
        ip: "127.0.0.1",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Authenticate as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
      href: "https://reddit-community.local",
      referrer: "https://reddit-community.local/login",
      ip: "127.0.0.1",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  // Create community with initial crossposting enabled
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const createCommunityBody = {
    name: communityName,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    category_name: "General",
    type: "public",
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);

  // Verify initial crossposting permission
  TestValidator.equals(
    "community created with crossposting enabled",
    community.allow_crosspost,
    true,
  );

  // Switch to moderator authentication
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "securePassword123",
      href: "https://reddit-community.local",
      referrer: "https://reddit-community.local/login",
      ip: "127.0.0.1",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Update community settings to disable crossposting
  const updateBody = {
    allow_crosspost: false,
    title: "Updated Community Title - Crossposting Disabled",
  } satisfies IRedditCommunityCommunity.IUpdate;

  const updatedCommunity =
    await api.functional.redditCommunity.communityModerator.communities.update(
      connection,
      {
        communityName: communityName,
        body: updateBody,
      },
    );
  typia.assert(updatedCommunity);

  // Verify crossposting permission was disabled
  TestValidator.equals(
    "community crossposting disabled by moderator",
    updatedCommunity.allow_crosspost,
    false,
  );
  TestValidator.equals(
    "community title updated",
    updatedCommunity.title,
    "Updated Community Title - Crossposting Disabled",
  );
  TestValidator.equals(
    "community ID unchanged",
    updatedCommunity.id,
    community.id,
  );

  // Re-enable crossposting to test toggle functionality
  const reenableBody = {
    allow_crosspost: true,
  } satisfies IRedditCommunityCommunity.IUpdate;

  const finalCommunity =
    await api.functional.redditCommunity.communityModerator.communities.update(
      connection,
      {
        communityName: communityName,
        body: reenableBody,
      },
    );
  typia.assert(finalCommunity);

  // Verify crossposting was re-enabled
  TestValidator.equals(
    "community crossposting re-enabled by moderator",
    finalCommunity.allow_crosspost,
    true,
  );
}
