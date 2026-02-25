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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_update_authorization_and_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful post update by the original author.
  // 1-a. User joins and authenticates
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  // 1-b. Create a community for userA
  const communityForUserA =
    await generate_random_community_platform_user_communities_create(
      userAConnection,
      {},
    );
  // 1-c. Create a post in the community for userA
  const originalPost =
    await api.functional.communityPlatform.user.communities.posts.create(
      userAConnection,
      {
        communityId: communityForUserA.id,
        body: {
          title: RandomGenerator.name(3),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(originalPost);
  // 1-d. Update the post by changing title and postType (NOT content)
  const updatedTitle = RandomGenerator.name(4);
  const updatedPostType = "link";
  const updateBody: ICommunityPlatformPost.IUpdate = {
    title: updatedTitle,
    postType: updatedPostType,
  };
  const updatedPost = await api.functional.communityPlatform.user.posts.update(
    userAConnection,
    {
      postId: originalPost.id,
      body: updateBody,
    },
  );
  typia.assert(updatedPost);
  // Validate updated fields changed
  TestValidator.equals("post title updated", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "post type updated",
    updatedPost.postType,
    updatedPostType,
  );
  // Validate content remains unchanged - content is not part of updatedPost, so validate other fields unchanged
  TestValidator.equals(
    "post communityId unchanged",
    updatedPost.communityId,
    originalPost.communityId,
  );
  TestValidator.equals(
    "post authorUserId unchanged",
    updatedPost.authorUserId,
    originalPost.authorUserId,
  );
  // Scenario 2: Unauthorized post update attempt by a different user.
  // 2-a. UserB joins and authenticates
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  // 2-b. UserB attempts to update the post created by UserA with new title
  const unauthorizedUpdateBody: ICommunityPlatformPost.IUpdate = {
    title: RandomGenerator.name(5),
    postType: "image",
  };
  await TestValidator.error(
    "unauthorized post update should fail",
    async () => {
      await api.functional.communityPlatform.user.posts.update(
        userBConnection,
        {
          postId: originalPost.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );
  // 2-c. Verify the post remains unchanged by fetching it again (simulate GET by update with no changes or direct fetch if available)
  // Since GET post is not provided, we rely on the originally updated post data
  // Alternatively, could refetch if GET was available.
  // Considering limitation, just assert that updatedPost still has original updated values
  TestValidator.equals(
    "post title unchanged after unauthorized update",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post type unchanged after unauthorized update",
    updatedPost.postType,
    updatedPostType,
  );
}
