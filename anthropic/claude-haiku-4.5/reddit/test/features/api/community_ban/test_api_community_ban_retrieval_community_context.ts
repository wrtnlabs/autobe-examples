import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_retrieval_community_context(
  connection: api.IConnection,
) {
  // 1. Create moderator account for ban retrieval operations
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(4).toUpperCase() +
    "123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8),
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create member account to ban
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(8) +
    RandomGenerator.alphabets(4).toUpperCase() +
    "456!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name is set", community.name, community.name);
  TestValidator.predicate(
    "community has positive subscriber count",
    community.subscriber_count >= 1,
  );

  // 4. Switch to moderator account
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create ban for member in community
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const createdBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "permanent",
          reason: banReason,
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(createdBan);

  // 6. Retrieve ban with community context
  const retrievedBan =
    await api.functional.communityPlatform.moderator.communities.bans.at(
      connection,
      {
        communityId: community.id,
        banId: createdBan.id,
      },
    );
  typia.assert(retrievedBan);

  // 7. Validate community context in retrieved ban
  TestValidator.predicate(
    "ban includes complete community context",
    retrievedBan.community !== null && retrievedBan.community !== undefined,
  );
  TestValidator.equals(
    "community id matches in ban",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier matches in ban",
    retrievedBan.community.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "community name matches in ban",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.predicate(
    "community has subscriber count metric",
    retrievedBan.community.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "community has post count metric",
    retrievedBan.community.post_count >= 0,
  );

  // 8. Validate ban record details
  TestValidator.equals(
    "ban member id matches",
    retrievedBan.member.id,
    member.id,
  );
  TestValidator.equals("ban reason matches", retrievedBan.reason, banReason);
  TestValidator.equals(
    "ban type is permanent",
    retrievedBan.ban_type,
    "permanent",
  );
  TestValidator.predicate(
    "ban has moderator context",
    retrievedBan.moderator !== null && retrievedBan.moderator !== undefined,
  );
}
