import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_images_upload_image } from "../../../generate/generate_random_reddit_platform_member_posts_images_upload_image";
import { generate_random_reddit_platform_member_subscriptions_subscribe } from "../../../generate/generate_random_reddit_platform_member_subscriptions_subscribe";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_post_image } from "../../../prepare/prepare_random_reddit_platform_post_image";

export async function test_api_post_images_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarUrl: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.Pattern<"^[a-zA-Z0-9_]+$"> &
              tags.MinLength<3> &
              tags.MaxLength<21>
          >(),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_subscribe(
      memberConnection,
      {
        body: {
          reddit_platform_community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Upload image to post (assume IMAGE type post exists in fixtures)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const imageUpload =
    await api.functional.redditPlatform.member.posts.images.uploadImage(
      memberConnection,
      {
        postId,
        body: {
          filename: "vacation.jpg",
          mime_type: "image/jpeg",
          file_size: 2048576 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<10485760>,
          file_path: `uploads/posts/${postId}/vacation.jpg`,
        },
      },
    );
  typia.assert(imageUpload);
  // 5. Validate response
  TestValidator.equals("image filename", imageUpload.filename, "vacation.jpg");
  TestValidator.equals("image mime type", imageUpload.mime_type, "image/jpeg");
  TestValidator.equals("image file size", imageUpload.file_size, 2048576);
  TestValidator.equals(
    "image file path",
    imageUpload.file_path,
    `uploads/posts/${postId}/vacation.jpg`,
  );
  TestValidator.equals("post ID reference", imageUpload.post.id, postId);
  TestValidator.equals("image status active", imageUpload.deleted_at, null);
  TestValidator.predicate(
    "has created timestamp",
    imageUpload.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated timestamp",
    imageUpload.updated_at !== undefined,
  );
}