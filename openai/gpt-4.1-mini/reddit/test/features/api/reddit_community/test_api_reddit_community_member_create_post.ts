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

export async function test_api_reddit_community_member_create_post(
  connection: api.IConnection,
) {
  // 1. Register a member user
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a community by the authenticated member
  const communityCreateBody = {
    name: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Submit a new post of type 'text' with title and body text
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }).slice(0, 300),
    body_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies IRedditCommunityPosts.ICreate;

  // Note: author_member_id and author_guest_id are not supplied by client

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4. Validate that the created post matches expectations
  TestValidator.equals(
    "created post community id",
    post.reddit_community_community_id,
    community.id,
  );

  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.equals(
    "post title matches request",
    post.title,
    postCreateBody.title,
  );
  TestValidator.equals(
    "post body_text matches request",
    post.body_text,
    postCreateBody.body_text,
  );

  // Confirm timestamps exist (created_at, updated_at are string ISO datetimes)
  TestValidator.predicate(
    "post created_at is ISO datetime string",
    typeof post.created_at === "string" &&
      post.created_at.length > 0 &&
      !Number.isNaN(Date.parse(post.created_at)),
  );

  TestValidator.predicate(
    "post updated_at is ISO datetime string",
    typeof post.updated_at === "string" &&
      post.updated_at.length > 0 &&
      !Number.isNaN(Date.parse(post.updated_at)),
  );

  // deleted_at, status, business_status are null or undefined
  TestValidator.predicate(
    "post deleted_at nullable",
    post.deleted_at === null || post.deleted_at === undefined,
  );
  TestValidator.predicate(
    "post status nullable",
    post.status === null || post.status === undefined,
  );
  TestValidator.predicate(
    "post business_status nullable",
    post.business_status === null || post.business_status === undefined,
  );
}
