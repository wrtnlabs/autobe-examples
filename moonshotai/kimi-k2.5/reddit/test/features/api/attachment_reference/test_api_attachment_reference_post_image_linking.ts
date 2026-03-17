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
import { generate_random_reddit_like_member_attachment_references_create } from "../../../generate/generate_random_reddit_like_member_attachment_references_create";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_attachment_reference } from "../../../prepare/prepare_random_reddit_like_attachment_reference";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_attachment_reference_post_image_linking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection with proper isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a member via join endpoint
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // 2. Upload an image file attachment
  const attachment =
    await generate_random_reddit_like_member_attachments_create(
      memberConnection,
      {
        body: {
          fileUri: "https://example.com/test-image.png",
          originalFilename: "test-image.png",
        } satisfies IRedditLikeAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 3. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 4. Subscribe to the community (required for post creation privileges)
  const subscription =
    await api.functional.redditLike.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 5. Create an image-type post referencing the uploaded attachment
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "image",
        attachment_id: attachment.id,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post post type", post.postType, "image");
  // 6. Create an attachment reference linking the attachment to the post
  const attachmentReference =
    await generate_random_reddit_like_member_attachment_references_create(
      memberConnection,
      {
        body: {
          attachmentId: attachment.id,
        } satisfies IRedditLikeAttachmentReference.ICreate,
      },
    );
  typia.assert(attachmentReference);
  // Validation points:
  // - Reference is created successfully
  TestValidator.predicate(
    "attachment reference exists",
    attachmentReference.id !== null,
  );
  // - The referenceType is 'post' (based on the scenario requirements)
  TestValidator.equals(
    "reference type is post",
    attachmentReference.referenceType,
    "post",
  );
  // - The attachment is correctly associated
  TestValidator.equals(
    "attachment ID matches",
    attachmentReference.attachment.id,
    attachment.id,
  );
  TestValidator.equals(
    "attachment original filename matches",
    attachmentReference.attachment.originalFilename,
    attachment.originalFilename,
  );
  TestValidator.equals(
    "attachment mime type matches",
    attachmentReference.attachment.mimeType,
    attachment.mimeType,
  );
  TestValidator.equals(
    "attachment file size matches",
    attachmentReference.attachment.fileSizeBytes,
    attachment.fileSizeBytes,
  );
}
