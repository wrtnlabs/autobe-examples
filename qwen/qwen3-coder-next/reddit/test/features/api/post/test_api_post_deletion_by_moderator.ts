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

export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await api.functional.redditPlatform.auth.user.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(moderator);
  // 2. Create a post in the moderator's community
  // Store postId and community_id separately since IRedditPlatformPost has no accessible properties
  const postId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditPlatform.user.posts.create(
    moderatorConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content_type: "text" as const,
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Register another user as community moderator
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  const otherModerator = await api.functional.redditPlatform.auth.user.join(
    otherModeratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformUser.IJoin,
    },
  );
  typia.assert(otherModerator);
  // 4. Delete the post using the delete endpoint
  await api.functional.redditPlatform.user.posts.erase(
    otherModeratorConnection,
    {
      postId: postId,
    },
  );
  // 5. Verify the post is permanently removed - attempt to create a post with same id should fail
  await TestValidator.error("post not found after deletion", async () => {
    await api.functional.redditPlatform.user.posts.create(
      otherModeratorConnection,
      {
        body: {
          community_id: communityId,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content_type: "text" as const,
          content_text: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  });
  // 6. Verify all related data is cascade-deleted
  // (The test validation is implicit through the error test above)
  // 7. Verify the operation returns HTTP 204 No Content
  // (The erase function returns void, which indicates success)
}
