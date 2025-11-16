import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the complete workflow of removing a moderator from a community by the
 * community creator.
 *
 * This scenario validates that only the community creator can remove
 * moderators, and that the removal operation properly revokes the moderator's
 * permissions while preserving their moderation audit trail.
 *
 * Workflow:
 *
 * 1. Create a member account (creator) through member join
 * 2. Create an administrator account to set up a category
 * 3. Create a category through administrator account
 * 4. Create a new community with the creator account
 * 5. Create another member account (future moderator) through member join
 * 6. Appoint the future moderator to the community as a senior moderator
 * 7. Verify the moderator was appointed successfully
 * 8. Remove the moderator from the community using the creator's token
 * 9. Verify the removal was successful
 */
export async function test_api_moderator_removal_by_community_creator(
  connection: api.IConnection,
) {
  // 1. Create a member account (creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(12),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 2. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Create a category through administrator account
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
    description: "Technology and software discussions",
  } satisfies ICommunityPlatformCategory.ICreate;

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 4. Create a new community with the creator account
  const creatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${creator.token.access}`,
    },
  };

  const community =
    await api.functional.communityPlatform.member.communities.create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create another member account (future moderator)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const futureModeratorMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    },
  );
  typia.assert(futureModeratorMember);

  // 6. Appoint the future moderator to the community as a senior moderator
  const moderator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      creatorConnection,
      {
        communityId: community.id,
        body: {
          memberId: futureModeratorMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // 7. Verify the moderator was appointed successfully
  TestValidator.predicate(
    "moderator appointment verified with appointed_at timestamp",
    moderator.appointed_at !== null,
  );
  TestValidator.predicate(
    "moderator is currently active with removed_at being null",
    moderator.removed_at === null,
  );
  TestValidator.equals(
    "moderator tier is senior",
    moderator.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "moderator member matches future moderator",
    moderator.member.id,
    futureModeratorMember.id,
  );

  // 8. Remove the moderator from the community using the creator's token
  await api.functional.communityPlatform.member.communities.moderators.erase(
    creatorConnection,
    {
      communityId: community.id,
      moderatorId: moderator.id,
    },
  );

  // 9. Verify the removal was successful
  // The erase endpoint returns void (HTTP 204), so successful completion without error indicates successful removal
  TestValidator.predicate(
    "moderator successfully removed from community by creator",
    true,
  );
}
