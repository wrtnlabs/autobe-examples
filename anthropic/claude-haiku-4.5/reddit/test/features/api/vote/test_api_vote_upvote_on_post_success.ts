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

export async function test_api_vote_upvote_on_post_success(
  connection: api.IConnection,
) {
  // Step 1: Create a member account to be the voter
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voterUsername = RandomGenerator.alphabets(10);

  const voter: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: voterEmail,
        username: voterUsername,
        password: "TestPassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(voter);

  // Step 2: Create an administrator account to create categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: adminUsername,
        password: "AdminPassword123!",
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Switch back to voter member account
  await api.functional.auth.member.login(connection, {
    body: {
      email: voterEmail,
      password: "TestPassword123!",
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Create an upvote on the post
  const vote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(vote);

  // Step 8: Validate the vote properties
  TestValidator.equals(
    "vote content_type should be post",
    vote.content_type,
    "post",
  );
  TestValidator.equals("vote_type should be upvote", vote.vote_type, "upvote");
  TestValidator.equals(
    "vote content_id should match post id",
    vote.content_id,
    post.id,
  );
  TestValidator.equals(
    "voter member id should match",
    vote.community_platform_member_id,
    voter.id,
  );

  // Step 9: Validate voter information is embedded in the vote
  TestValidator.equals(
    "member username in vote should match voter username",
    vote.member.username,
    voterUsername,
  );

  // Step 10: Validate timestamps are recorded
  TestValidator.predicate(
    "vote created_at should be a valid ISO date-time",
    () => {
      const date = new Date(vote.created_at);
      return !isNaN(date.getTime());
    },
  );
}
