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

export async function test_api_post_vote_creation_downvote(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(5)}`,
          display_order: 1,
          description: "Technology and programming discussions",
          icon_url: "https://example.com/icons/tech.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account (post creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(8)}`,
      password: "CreatorPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A place to discuss technology topics",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "How to learn TypeScript?",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create another member account (voter)
  const voterEmail = typia.random<string & tags.Format<"email">>();
  const voter = await api.functional.auth.member.join(connection, {
    body: {
      email: voterEmail,
      username: `voter_${RandomGenerator.alphaNumeric(8)}`,
      password: "VoterPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(voter);

  // 7. Cast downvote on the post
  const downvote =
    await api.functional.communityPlatform.member.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: {
          content_type: "post",
          content_id: post.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // 8. Verify downvote record
  TestValidator.equals(
    "vote type should be downvote",
    downvote.vote_type,
    "downvote",
  );
  TestValidator.equals(
    "content type should be post",
    downvote.content_type,
    "post",
  );
  TestValidator.equals(
    "content id should match post id",
    downvote.content_id,
    post.id,
  );
  TestValidator.predicate(
    "voter member id should match vote record",
    downvote.community_platform_member_id === voter.id,
  );
}
