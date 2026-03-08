import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_add_moderator } from "../../../generate/generate_random_community_platform_member_communities_moderators_add_moderator";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

/**
 * Test the community owner retrieving a moderator's appointment details.
 *
 * This test validates the primary authorization path where the community owner
 * exercises their governance authority to view moderator information.
 *
 * Test Flow:
 * 1. Create and authenticate community owner account
 * 2. Owner creates a community (becoming owner automatically)
 * 3. Create and authenticate a second member account
 * 4. Owner appoints the second member as moderator
 * 5. Owner retrieves the moderator details by ID
 * 6. Validate response contains all expected fields and correct linkages
 */
export async function test_api_moderator_detail_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // Step 2: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a separate member account (to be appointed as moderator)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // Step 4: Owner appoints the member as moderator
  const moderatorRecord =
    await generate_random_community_platform_member_communities_moderators_add_moderator(
      ownerConnection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          username: member.username,
        },
      },
    );
  typia.assert(moderatorRecord);
  // Step 5: Owner retrieves the moderator details by ID
  const moderatorDetails =
    await api.functional.communityPlatform.communities.moderators.at(
      ownerConnection,
      {
        communityName: community.name,
        moderatorId: moderatorRecord.id,
      },
    );
  typia.assert(moderatorDetails);
  // Step 6: Validate response structure and linkages
  // Validate moderator record ID matches
  TestValidator.equals(
    "moderator record ID",
    moderatorDetails.id,
    moderatorRecord.id,
  );
  // Validate member information
  TestValidator.equals(
    "member ID matches",
    moderatorDetails.member.id,
    member.id,
  );
  TestValidator.equals(
    "member username matches",
    moderatorDetails.member.username,
    member.username,
  );
  TestValidator.equals(
    "member display name matches",
    moderatorDetails.member.display_name,
    member.displayName,
  );
  TestValidator.equals(
    "member karma initial",
    moderatorDetails.member.karma,
    member.karma,
  );
  // Validate community information
  TestValidator.equals(
    "community ID matches",
    moderatorDetails.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    moderatorDetails.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    moderatorDetails.community.description,
    community.description,
  );
  // Validate timestamps exist (created_at and updated_at should be valid date-time)
  TestValidator.predicate(
    "has created_at timestamp",
    moderatorDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    moderatorDetails.updated_at.length > 0,
  );
}
