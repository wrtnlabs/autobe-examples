import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";

export async function test_api_comment_vote_creation_downvote(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(12),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for content organization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `category_${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create first member (post and comment author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "Password123!";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 4: Create community for posts
  const community =
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
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post in community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create comment on post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 7: Create second member for downvoting
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "Password456!";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 8: Cast downvote on comment
  const downvote =
    await api.functional.communityPlatform.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          content_type: "comment",
          content_id: comment.id,
          vote_type: "downvote",
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(downvote);

  // Validate downvote record contains correct fields and references
  TestValidator.equals(
    "vote references correct voting member",
    downvote.community_platform_member_id,
    member2.id,
  );
  TestValidator.equals(
    "vote member summary is present",
    downvote.member.id,
    member2.id,
  );
  TestValidator.equals(
    "vote content type is comment",
    downvote.content_type,
    "comment",
  );
  TestValidator.equals(
    "vote content ID matches target comment",
    downvote.content_id,
    comment.id,
  );
  TestValidator.equals("vote type is downvote", downvote.vote_type, "downvote");
  TestValidator.predicate("vote has valid creation timestamp", () => {
    const createdDate = new Date(downvote.created_at);
    const now = new Date();
    return now.getTime() - createdDate.getTime() < 60000; // Within last 60 seconds
  });
}
