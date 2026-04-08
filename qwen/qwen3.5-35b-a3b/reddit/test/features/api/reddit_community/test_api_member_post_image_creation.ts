import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_post_image_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // 2. Generate a valid community ID for subscription
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Subscribe member to the community
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 4. Store the input title for validation
  const inputTitle = RandomGenerator.paragraph({ sentences: 2 });
  // 5. Create an image post with file attachments
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: inputTitle,
        post_type: "image",
        reddit_community_community_id: subscription.community.id,
        files: [
          {
            file_name: "test-image.png",
            file_type: "image/png",
            file_size: 1024,
            file_url: "/uploads/test-image.png",
          },
        ],
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 6. Validate post properties
  TestValidator.equals("post title matches input", imagePost.title, inputTitle);
  TestValidator.equals("post type is image", imagePost.post_type, "image");
  TestValidator.equals(
    "community association",
    imagePost.community.id,
    subscription.community.id,
  );
  TestValidator.equals("vote score initialized to 0", imagePost.vote_score, 0);
  TestValidator.equals(
    "comment count initialized to 0",
    imagePost.comment_count,
    0,
  );
  TestValidator.equals(
    "text content is null for image post",
    imagePost.text_content,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active post",
    imagePost.deleted_at,
    null,
  );
  TestValidator.equals(
    "post has valid author reference",
    imagePost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "post has valid community reference",
    imagePost.community.id,
    subscription.community.id,
  );
}
