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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Validate administrator filtering of voting records by content type.
 *
 * Tests that administrators can successfully filter voting records using the
 * content_type parameter to retrieve only votes for specific content types
 * (posts or comments). This ensures the voting records API properly separates
 * votes by their target entity type.
 *
 * Test workflow:
 *
 * 1. Administrator registration and authentication
 * 2. Member registration for vote casting
 * 3. Community creation for content hosting
 * 4. Post creation as voteable content
 * 5. Vote casting on the post
 * 6. Query votes filtered by content_type='post' as administrator
 * 7. Query votes filtered by content_type='comment' as administrator
 * 8. Validate filter accuracy and correctness
 */
export async function test_api_voting_records_administrator_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate member for voting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community for content
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_only",
          category_slug: "technology",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create post in community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Cast upvote on post
  const postVote: ICommunityPlatformVote =
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: post.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  typia.assert(postVote);
  TestValidator.equals(
    "post vote content type is post",
    postVote.content_type,
    "post",
  );
  TestValidator.equals(
    "post vote type is upvote",
    postVote.vote_type,
    "upvote",
  );

  // Switch to administrator authentication context
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Query voting records filtered by content_type='post'
  const postVotesResult: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          content_type: "post",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(postVotesResult);
  TestValidator.predicate(
    "post votes query returned results",
    postVotesResult.data.length > 0,
  );

  // Verify all returned votes are for posts
  for (const vote of postVotesResult.data) {
    TestValidator.equals(
      "filtered vote content type is post",
      vote.content_type,
      "post",
    );
  }

  // Step 7: Query voting records filtered by content_type='comment'
  const commentVotesResult: IPageICommunityPlatformVote =
    await api.functional.communityPlatform.administrator.votes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          content_type: "comment",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(commentVotesResult);

  // Verify all returned votes are for comments (or empty if no comments were voted)
  for (const vote of commentVotesResult.data) {
    TestValidator.equals(
      "filtered vote content type is comment",
      vote.content_type,
      "comment",
    );
  }

  // Step 8: Validate filter accuracy
  TestValidator.predicate(
    "post filter excludes comment votes",
    postVotesResult.data.every((vote) => vote.content_type === "post"),
  );
  TestValidator.predicate(
    "comment filter excludes post votes",
    commentVotesResult.data.every((vote) => vote.content_type === "comment"),
  );
}
