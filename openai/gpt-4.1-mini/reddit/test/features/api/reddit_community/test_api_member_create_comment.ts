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

export async function test_api_member_create_comment(
  connection: api.IConnection,
) {
  // 1. Register a new member by calling api.functional.auth.member.join
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  // Use the authenticated connection with member token set by join
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Create a post in the community
  // Choose post_type randomly among valid strings: text, link, image
  const postTypeOptions = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypeOptions);

  // Compose post create body with required properties depending on postType
  const postCreateBody: IRedditCommunityPosts.ICreate = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 5 }),
  };

  if (postType === "text") {
    postCreateBody.body_text = RandomGenerator.content({ paragraphs: 3 });
  } else if (postType === "link") {
    postCreateBody.link_url = `https://${RandomGenerator.alphabets(8)}.com`;
  } else if (postType === "image") {
    postCreateBody.image_url = `https://images.example.com/${RandomGenerator.alphaNumeric(10)}.jpg`;
  }

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 4. Create a comment on the post
  // Compose comment create body
  const commentCreateBody = {
    reddit_community_post_id: post.id,
    body_text: RandomGenerator.paragraph({ sentences: 8 }),
    author_member_id: member.id,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 5. Validate the created comment's properties
  TestValidator.equals(
    "comment author_member_id matches",
    comment.author_member_id,
    member.id,
  );
  TestValidator.equals(
    "comment reddit_community_post_id matches",
    comment.reddit_community_post_id,
    post.id,
  );
  TestValidator.predicate(
    "comment body_text is not empty",
    typeof comment.body_text === "string" && comment.body_text.length > 0,
  );
}
