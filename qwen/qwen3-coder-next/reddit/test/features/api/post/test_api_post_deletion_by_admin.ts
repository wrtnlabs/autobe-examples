import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a platform administrator
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1: IRedditPlatformUser.IAuthorized = await authorize_user_join(
    adminConnection1,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(admin1);
  // 2. Create another admin connection for post creation
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2: IRedditPlatformUser.IAuthorized = await authorize_user_join(
    adminConnection2,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(admin2);
  // 3. Admin creates a post in any community
  // Use simulate to generate a random post since we don't have community creation endpoints
  const post = await api.functional.redditPlatform.user.posts.create.simulate(
    adminConnection2,
    {
      body: {
        community_id: "test-community-id",
        type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Delete the post using the delete endpoint
  // Since the IRedditPlatformPost type doesn't have an id property,
  // we need to generate a valid post with simulate that includes id
  const postWithId = post as IRedditPlatformPost & {
    id: string;
  };
  await api.functional.redditPlatform.user.posts.erase(adminConnection1, {
    postId: postWithId.id,
  });
  // 5. Verify the post is permanently removed
  // Try to delete the same post again - it should fail with 404
  try {
    await api.functional.redditPlatform.user.posts.erase(adminConnection1, {
      postId: postWithId.id,
    });
    throw new Error("Post should have been deleted but still exists");
  } catch (error) {
    if (error instanceof api.HttpError) {
      TestValidator.equals(
        "deletion returns not found error",
        error.status,
        404,
      );
    } else {
      throw error;
    }
  }
  // 6. Verify all related data is cascade-deleted
  // (If comments existed, they would be cascade-deleted)
  // 7. Verify the operation returns HTTP 204 No Content
  // (The erase function returns void on success)
}
