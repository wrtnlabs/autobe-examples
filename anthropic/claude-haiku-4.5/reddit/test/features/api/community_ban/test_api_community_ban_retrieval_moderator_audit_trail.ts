import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_retrieval_moderator_audit_trail(
  connection: api.IConnection,
) {
  // 1. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create a member to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Switch to moderator account for ban creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create a temporary ban with moderator audit trail
  const banExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const ban: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Violation of community rules regarding respectful discourse",
          expires_at: banExpiration,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);

  // 6. Retrieve the ban record and verify moderator audit trail information
  const retrievedBan: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);

  // 7. Validate that moderator information is accurately recorded in the audit trail
  TestValidator.equals(
    "ban moderator ID matches issuing moderator",
    retrievedBan.moderator.id,
    moderator.id,
  );

  TestValidator.equals(
    "ban moderator username matches issuing moderator",
    retrievedBan.moderator.username,
    moderator.username,
  );

  // 8. Validate that all ban details are preserved correctly
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.member.id,
    member.id,
  );

  TestValidator.equals(
    "community reference is accurate",
    retrievedBan.community.id,
    community.id,
  );

  TestValidator.equals(
    "ban type is temporary",
    retrievedBan.ban_type,
    "temporary",
  );

  TestValidator.predicate(
    "ban reason is recorded",
    retrievedBan.reason.length > 0,
  );

  TestValidator.predicate(
    "ban expiration timestamp is set",
    retrievedBan.expires_at !== null && retrievedBan.expires_at !== undefined,
  );
}
