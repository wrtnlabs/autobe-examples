import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test creating an image-type post that requires an uploaded attachment.
 *
 * 1) Authenticate as a member via /redditLike/auth/member/join
 * 2) Create a community via /redditLike/member/communities
 * 3) Subscribe to the community
 * 4) Upload an image attachment via /redditLike/member/attachments
 * 5) Create an image post referencing the uploaded attachment_id
 * 6) Verify the response returns IRedditLikePost with postType='image', proper image content structure with attachment reference, and initialized counters
 */
export async function test_api_post_image_creation_with_attachment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Upload image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 5. Create image post referencing the uploaded attachment
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        community_id: community.id,
        post_type: "image",
        attachment_id: attachment.id,
      },
    },
  );
  typia.assert(post);
  // 6. Validate response structure and values
  TestValidator.equals("post type is image", post.postType, "image");
  TestValidator.equals("title matches input", post.title, postTitle);
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals("author is the member", post.author.id, member.id);
  TestValidator.equals("vote score initialized to 0", post.voteScore, 0);
  TestValidator.equals("comment count initialized to 0", post.commentCount, 0);
  TestValidator.equals("post is not deleted", post.isDeleted, false);
  // Validate image content structure
  const imageContent = post.content as IRedditLikePostImageContent;
  TestValidator.equals(
    "content has attachment reference",
    imageContent.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment filename matches",
    imageContent.attachment.originalFilename,
    attachment.originalFilename,
  );
}
