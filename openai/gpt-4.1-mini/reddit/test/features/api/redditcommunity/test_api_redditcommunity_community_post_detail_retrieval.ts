import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

export async function test_api_redditcommunity_community_post_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Member user authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: password,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create community
  const createCommunityBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  // 3. Create post
  // Pick one of three types: text, link, image
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);

  // Assemble post body accordingly
  const postBodyBase = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 5,
      wordMax: 12,
    }).slice(0, 300),
  };

  let postBody: IRedditCommunityPosts.ICreate;

  if (postType === "text") {
    postBody = {
      ...postBodyBase,
      body_text: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 10,
        sentenceMax: 20,
        wordMin: 4,
        wordMax: 10,
      }),
      link_url: null,
      image_url: null,
    };
  } else if (postType === "link") {
    // Provide a realistic http/https URL
    const url = `https://${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }).replace(/[\s]/g, "").toLowerCase()}.com`;

    postBody = {
      ...postBodyBase,
      body_text: null,
      link_url: url,
      image_url: null,
    };
  } else {
    // image
    // Provide a plausible image URL
    const imageUrl = `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`;

    postBody = {
      ...postBodyBase,
      body_text: null,
      link_url: null,
      image_url: imageUrl,
    };
  }

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 4. Retrieve post detail
  const retrievedPost: IRedditCommunityPost =
    await api.functional.redditCommunity.communities.posts.at(connection, {
      communityId: community.id,
      postId: post.id,
    });
  typia.assert(retrievedPost);

  // 5. Validate that retrieved post matches creation
  TestValidator.equals("post.id should match", retrievedPost.id, post.id);
  TestValidator.equals(
    "community id should match",
    retrievedPost.reddit_community_community_id,
    post.reddit_community_community_id,
  );
  TestValidator.equals(
    "post type should match",
    retrievedPost.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "post title should match",
    retrievedPost.title,
    post.title,
  );

  if (postType === "text") {
    TestValidator.equals(
      "post body_text should match",
      retrievedPost.body_text,
      post.body_text,
    );
    TestValidator.equals(
      "post link_url should be null",
      retrievedPost.link_url,
      null,
    );
    TestValidator.equals(
      "post image_url should be null",
      retrievedPost.image_url,
      null,
    );
  } else if (postType === "link") {
    TestValidator.equals(
      "post body_text should be null",
      retrievedPost.body_text,
      null,
    );
    TestValidator.equals(
      "post link_url should match",
      retrievedPost.link_url,
      post.link_url,
    );
    TestValidator.equals(
      "post image_url should be null",
      retrievedPost.image_url,
      null,
    );
  } else {
    TestValidator.equals(
      "post body_text should be null",
      retrievedPost.body_text,
      null,
    );
    TestValidator.equals(
      "post link_url should be null",
      retrievedPost.link_url,
      null,
    );
    TestValidator.equals(
      "post image_url should match",
      retrievedPost.image_url,
      post.image_url,
    );
  }

  // Validate timestamps and optional fields
  TestValidator.predicate(
    "post created_at should be ISO string",
    typeof retrievedPost.created_at === "string" &&
      retrievedPost.created_at.length > 0,
  );
  TestValidator.predicate(
    "post updated_at should be ISO string",
    typeof retrievedPost.updated_at === "string" &&
      retrievedPost.updated_at.length > 0,
  );

  TestValidator.equals(
    "post deleted_at should match",
    retrievedPost.deleted_at ?? null,
    post.deleted_at ?? null,
  );
  TestValidator.equals(
    "post status should match",
    retrievedPost.status ?? null,
    post.status ?? null,
  );
  TestValidator.equals(
    "post business_status should match",
    retrievedPost.business_status ?? null,
    post.business_status ?? null,
  );
}
