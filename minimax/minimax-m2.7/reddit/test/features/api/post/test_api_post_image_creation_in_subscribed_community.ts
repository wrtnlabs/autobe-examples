import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_files_create } from "../../../generate/generate_random_reddit_clone_member_files_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_file } from "../../../prepare/prepare_random_reddit_clone_file";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_image_creation_in_subscribed_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create target community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Upload image file
  const file = await generate_random_reddit_clone_member_files_create(
    memberConnection,
    {},
  );
  typia.assert(file);
  // 5. Create image post with the uploaded file
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        fileId: file.id,
        title: postTitle,
        type: "image",
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Validate response
  TestValidator.equals("post has valid id", !!post.id, true);
  TestValidator.equals("title matches request", post.title, postTitle);
  TestValidator.equals("type is image", post.type, "image");
  TestValidator.equals("voteScore is 0", post.voteScore, 0);
  TestValidator.equals("commentCount is 0", post.commentCount, 0);
  // Validate image content with file metadata
  TestValidator.equals("image has valid id", !!post.image.id, true);
  TestValidator.equals("image file id matches", post.image.file.id, file.id);
  TestValidator.equals(
    "original filename exists",
    !!post.image.file.originalFilename,
    true,
  );
  TestValidator.equals("mime type exists", !!post.image.file.mimeType, true);
  TestValidator.equals("file size exists", !!post.image.file.fileSize, true);
  // Validate author
  TestValidator.equals("author id matches", post.author.id, authorized.id);
  TestValidator.equals(
    "author username matches",
    post.author.username,
    authorized.username,
  );
  // Validate community
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  // Validate timestamps
  TestValidator.equals("createdAt exists", !!post.createdAt, true);
  TestValidator.equals("updatedAt exists", !!post.updatedAt, true);
}
