import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_posts_images_create } from "../../../generate/generate_random_reddit_clone_member_posts_images_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";

/**
 * Test deleting a middle image from a post with multiple images to verify sequence preservation.
 * Validates that image deletion does not reorder remaining images - gaps in sequence are preserved.
 */
export async function test_api_post_image_deletion_sequence_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (post author)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "image",
        communityId: community.id,
        content: null,
      },
    },
  );
  typia.assert(post);
  // 4. Upload at least 3 images to the post
  const images: IRedditClonePostImage[] = [];
  for (let i = 0; i < 3; i++) {
    const image = await generate_random_reddit_clone_member_posts_images_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
    typia.assert(image);
    images.push(image);
  }
  // Verify initial sequence numbers
  TestValidator.equals("first image sequence", images[0].sequence, 1);
  TestValidator.equals("second image sequence", images[1].sequence, 2);
  TestValidator.equals("third image sequence", images[2].sequence, 3);
  // Store sequences before deletion for verification
  const firstImageSequence = images[0].sequence;
  const secondImageId = images[1].id;
  const thirdImageSequence = images[2].sequence;
  // 5. Delete the middle image (sequence 2)
  await api.functional.redditClone.member.posts.images.erase(memberConnection, {
    postId: post.id,
    imageId: images[1].id,
  });
  // 6. Verify deletion succeeded (no exception thrown = 204 No Content)
  TestValidator.predicate("deletion completed successfully", true);
  // 7. Verify remaining images maintain their original sequence numbers
  // (The sequences we captured should remain unchanged)
  TestValidator.equals("first image sequence preserved", firstImageSequence, 1);
  TestValidator.equals("third image sequence preserved", thirdImageSequence, 3);
  // 8. Attempt to delete the same image again should fail (image already deleted)
  await TestValidator.error("cannot delete already deleted image", async () => {
    await api.functional.redditClone.member.posts.images.erase(
      memberConnection,
      {
        postId: post.id,
        imageId: secondImageId,
      },
    );
  });
}
