import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachmentReference";
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

export async function test_api_attachment_reference_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Upload an image attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {},
    );
  typia.assert(attachment);
  // 5. Create an image post with the attachment
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "image",
        attachment_id: attachment.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post type is image", post.postType, "image");
  // 6. Extract referenceId from post content (image content id is the reference id)
  const imageContent = post.content as IRedditLikePostImageContent;
  const referenceId = imageContent.id;
  // 7. Retrieve the attachment reference
  const reference = await api.functional.redditLike.attachment_references.at(
    connection,
    {
      referenceId,
    },
  );
  typia.assert(reference);
  // 8. Validate response metadata matches expected values
  TestValidator.equals(
    "reference id matches request",
    reference.id,
    referenceId,
  );
  TestValidator.equals(
    "reference type is post",
    reference.referenceType,
    "post",
  );
  TestValidator.equals(
    "attachment id matches uploaded",
    reference.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment storagePath matches",
    reference.attachment.storagePath,
    attachment.storagePath,
  );
  TestValidator.equals(
    "attachment originalFilename matches",
    reference.attachment.originalFilename,
    attachment.originalFilename,
  );
  TestValidator.equals(
    "attachment mimeType matches",
    reference.attachment.mimeType,
    attachment.mimeType,
  );
  TestValidator.equals(
    "attachment fileSizeBytes matches",
    reference.attachment.fileSizeBytes,
    attachment.fileSizeBytes,
  );
  TestValidator.equals(
    "attachment checksumSha256 matches",
    reference.attachment.checksumSha256,
    attachment.checksumSha256,
  );
  TestValidator.equals(
    "uploader id matches member",
    reference.attachment.uploader.id,
    member.id,
  );
  TestValidator.equals(
    "uploader username matches",
    reference.attachment.uploader.username,
    member.username,
  );
}
