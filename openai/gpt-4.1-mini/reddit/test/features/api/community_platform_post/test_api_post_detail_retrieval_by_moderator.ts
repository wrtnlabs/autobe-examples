import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_detail_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorJoin);
  // 2. User join and login
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(userJoin);
  // 3. User creates community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // Post types to test
  const postTypes: ("text" | "link" | "image")[] = ["text", "link", "image"];
  // Function to create post body based on type
  function createPostBody(
    postType: "text" | "link" | "image",
  ): ICommunityPlatformPost.ICreate {
    if (postType === "text") {
      return {
        title: `Test Text Post ${RandomGenerator.alphaNumeric(5)}`,
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 3 }),
      };
    } else if (postType === "link") {
      return {
        title: `Test Link Post ${RandomGenerator.alphaNumeric(5)}`,
        postType: "link",
        url: "https://example.com/test",
      };
    } else {
      return {
        title: `Test Image Post ${RandomGenerator.alphaNumeric(5)}`,
        postType: "image",
        images: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
        ],
      };
    }
  }
  // 4. User creates posts of each type
  const createdPosts: ICommunityPlatformPost[] = [];
  for (const postType of postTypes) {
    const body = createPostBody(postType);
    const post =
      await api.functional.communityPlatform.user.communities.posts.create(
        userConnection,
        {
          communityId: community.id,
          body,
        },
      );
    typia.assert(post);
    createdPosts.push(post);
  }
  // 5. Moderator retrieves each post by postId and validates
  for (const post of createdPosts) {
    const retrievedPost =
      await api.functional.communityPlatform.moderator.posts.at(
        moderatorConnection,
        {
          postId: post.id,
        },
      );
    typia.assert(retrievedPost);
    // Validate post id match
    TestValidator.equals("post id should match", retrievedPost.id, post.id);
    // Validate community id
    TestValidator.equals(
      "community id should match",
      retrievedPost.communityId,
      community.id,
    );
    // Validate author is either user or moderator
    TestValidator.predicate(
      "author userId or moderatorId should exist",
      retrievedPost.authorUserId !== null ||
        retrievedPost.authorModeratorId !== null,
    );
    if (retrievedPost.authorUserId !== null) {
      typia.assert(retrievedPost.authorUser);
      TestValidator.equals(
        "author user id matches",
        retrievedPost.authorUserId,
        retrievedPost.authorUser!.id,
      );
    }
    if (retrievedPost.authorModeratorId !== null) {
      typia.assert(retrievedPost.authorModerator);
      // Cannot access id since moderator summary has no id
      // Just assert authorModerator is defined and not null
    }
    // Validate community summary
    typia.assert(retrievedPost.community);
    TestValidator.equals(
      "community id in post",
      retrievedPost.community.id,
      community.id,
    );
    // Validate postType and content fields
    TestValidator.equals(
      "post type matches",
      retrievedPost.postType,
      post.postType,
    );
    if (retrievedPost.postType === "text") {
      // text post should have content as string
      TestValidator.predicate(
        "text post has content",
        typeof (retrievedPost as any).content === "string",
      );
    } else if (retrievedPost.postType === "link") {
      // link post should have url as string
      TestValidator.predicate(
        "link post has url",
        typeof (retrievedPost as any).url === "string",
      );
    } else if (retrievedPost.postType === "image") {
      // image post should have images array
      TestValidator.predicate(
        "image post has images",
        Array.isArray((retrievedPost as any).images) &&
          (retrievedPost as any).images.length > 0,
      );
    }
  }
  // 6. Test retrieving a non-existent post
  await TestValidator.httpError(
    "non-existent post returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.posts.at(
        moderatorConnection,
        {
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
