import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import type { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_files_create } from "../../../generate/generate_random_community_member_files_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_file } from "../../../prepare/prepare_random_community_file";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test retrieval of an IMAGE type post with type-specific content fields.
 * Setup flow: (1) Create a member account via join, (2) Create a community,
 * (3) Subscribe to the community, (4) Upload an image file, (5) Create an IMAGE type post
 * referencing the uploaded image. Then call GET /community/posts/{postId} with the
 * created post's ID. Validate response contains: postType ('IMAGE'), imageUrl,
 * imageThumbnailUrl, title, author, community, vote metrics, and timestamps.
 * Verify textContent is null and linkUrl is null for IMAGE posts.
 */
export async function test_api_post_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Upload an image file for the IMAGE post
  const imageFile = await generate_random_community_member_files_create(
    memberConnection,
    {
      body: {
        file_type: "POST_IMAGE",
        file: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      } satisfies ICommunityFile.ICreate,
    },
  );
  typia.assert(imageFile);
  // 5. Create an IMAGE type post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const createdPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: postTitle,
          post_type: "IMAGE",
          image_url: imageFile.storage_path,
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(createdPost);
  // 6. Retrieve the post using GET endpoint
  const retrievedPost = await api.functional.community.posts.at(
    memberConnection,
    { postId: createdPost.id },
  );
  typia.assert(retrievedPost);
  // 7. Validate IMAGE type-specific business logic
  TestValidator.equals("post type is IMAGE", retrievedPost.postType, "IMAGE");
  TestValidator.equals("post ID matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, postTitle);
  // Validate type-specific fields: IMAGE posts should have null text/link content
  TestValidator.equals(
    "textContent is null for IMAGE post",
    retrievedPost.textContent ?? null,
    null,
  );
  TestValidator.equals(
    "linkUrl is null for IMAGE post",
    retrievedPost.linkUrl ?? null,
    null,
  );
  // Validate author matches the authenticated member
  TestValidator.equals("author ID matches", retrievedPost.author.id, member.id);
  // Validate community matches
  TestValidator.equals(
    "community ID matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  // Validate vote metrics: author gets automatic upvote on post creation
  TestValidator.predicate(
    "voteScore includes author auto-upvote",
    retrievedPost.voteScore >= 1,
  );
  TestValidator.predicate(
    "upvoteCount includes author auto-upvote",
    retrievedPost.upvoteCount >= 1,
  );
  TestValidator.equals(
    "downvoteCount starts at zero",
    retrievedPost.downvoteCount,
    0,
  );
  TestValidator.equals(
    "commentCount starts at zero",
    retrievedPost.commentCount,
    0,
  );
}
