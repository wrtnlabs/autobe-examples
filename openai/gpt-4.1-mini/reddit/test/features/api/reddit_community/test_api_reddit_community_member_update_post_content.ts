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

export async function test_api_reddit_community_member_update_post_content(
  connection: api.IConnection,
) {
  // Step 1: Member user joins and authenticates
  const joinBody = {
    email: `user.${typia.random<string & tags.Format<"email">>()}`,
    password: "Abc12345!",
  } satisfies IRedditCommunityMember.ICreate;
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);

  // Step 2: Create a new community
  const communityCreateBody = {
    name: `community_${RandomGenerator.alphaNumeric(10)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Step 3: Create a post in the community
  const postTypes = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypes);
  let postBody: IRedditCommunityPosts.ICreate;

  if (postType === "text") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "text",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 8,
      }).slice(0, 300),
      body_text: RandomGenerator.content({ paragraphs: 2 }),
      link_url: null,
      image_url: null,
    } satisfies IRedditCommunityPosts.ICreate;
  } else if (postType === "link") {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "link",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 8,
      }).slice(0, 300),
      body_text: null,
      link_url: `https://${RandomGenerator.alphabets(10)}.com/${RandomGenerator.alphaNumeric(6)}`,
      image_url: null,
    } satisfies IRedditCommunityPosts.ICreate;
  } else {
    postBody = {
      reddit_community_community_id: community.id,
      post_type: "image",
      title: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 8,
      }).slice(0, 300),
      body_text: null,
      link_url: null,
      image_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    } satisfies IRedditCommunityPosts.ICreate;
  }

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // Step 4: Update the post content
  let updateBody: IRedditCommunityPosts.IUpdate;
  if (postType === "text") {
    updateBody = {
      title: `${post.title} - updated`,
      body_text: `${postBody.body_text} Updated content.`,
      link_url: null,
      image_url: null,
    } satisfies IRedditCommunityPosts.IUpdate;
  } else if (postType === "link") {
    updateBody = {
      title: `${post.title} - updated`,
      body_text: null,
      link_url: `https://${RandomGenerator.alphabets(8)}.net/updated`,
      image_url: null,
    } satisfies IRedditCommunityPosts.IUpdate;
  } else {
    updateBody = {
      title: `${post.title} - updated`,
      body_text: null,
      link_url: null,
      image_url: `https://example.com/${RandomGenerator.alphaNumeric(12)}_updated.jpg`,
    } satisfies IRedditCommunityPosts.IUpdate;
  }

  const updatedPost: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.updatePost(
      connection,
      { communityId: community.id, postId: post.id, body: updateBody },
    );
  typia.assert(updatedPost);

  // Step 5: Validation of updated content
  TestValidator.equals(
    "updated post title",
    updatedPost.title,
    updateBody.title!,
  );
  TestValidator.equals(
    "updated post body_text",
    updatedPost.body_text,
    updateBody.body_text ?? null,
  );
  TestValidator.equals(
    "updated post link_url",
    updatedPost.link_url,
    updateBody.link_url ?? null,
  );
  TestValidator.equals(
    "updated post image_url",
    updatedPost.image_url,
    updateBody.image_url ?? null,
  );
}
