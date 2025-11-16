import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

export async function test_api_vote_multiple_members_same_post(
  connection: api.IConnection,
) {
  // Step 1: Create first member account
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Create second member account
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "AdminPassword123!",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 4: Create a category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member1 and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post should be created by member1",
    post.creator.id,
    member1.id,
  );
  TestValidator.equals(
    "post vote score should be 0 initially",
    post.vote_score,
    0,
  );
  TestValidator.equals(
    "post upvote count should be 0 initially",
    post.upvote_count,
    0,
  );
  TestValidator.equals(
    "post downvote count should be 0 initially",
    post.downvote_count,
    0,
  );

  // Step 7: Switch to member2 and cast a downvote on the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote2 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "downvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote2);
  TestValidator.equals(
    "vote2 should be cast by member2",
    vote2.community_platform_member_id,
    member2.id,
  );
  TestValidator.equals(
    "vote2 should be a downvote",
    vote2.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "vote2 content_type should be post",
    vote2.content_type,
    "post",
  );
  TestValidator.equals(
    "vote2 content_id should match post id",
    vote2.content_id,
    post.id,
  );

  // Step 8: Switch back to member1 and cast an upvote on the same post
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const vote1 = await api.functional.communityPlatform.member.votes.create(
    connection,
    {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(vote1);
  TestValidator.equals(
    "vote1 should be cast by member1",
    vote1.community_platform_member_id,
    member1.id,
  );
  TestValidator.equals("vote1 should be an upvote", vote1.vote_type, "upvote");
  TestValidator.equals(
    "vote1 content_type should be post",
    vote1.content_type,
    "post",
  );
  TestValidator.equals(
    "vote1 content_id should match post id",
    vote1.content_id,
    post.id,
  );

  // Step 9: Validate that votes are independent
  TestValidator.notEquals(
    "vote1 and vote2 should have different IDs",
    vote1.id,
    vote2.id,
  );
  TestValidator.notEquals(
    "vote1 and vote2 should be cast by different members",
    vote1.community_platform_member_id,
    vote2.community_platform_member_id,
  );
  TestValidator.predicate(
    "vote1 and vote2 should reference the same post",
    () => vote1.content_id === vote2.content_id,
  );
}
