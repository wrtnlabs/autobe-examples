import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityRole";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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
import { generate_random_reddit_platform_moderator_communities_moderators_add } from "../../../generate/generate_random_reddit_platform_moderator_communities_moderators_add";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { generate_random_reddit_platform_user_posts_create } from "../../../generate/generate_random_reddit_platform_user_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_role } from "../../../prepare/prepare_random_reddit_platform_community_role";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_visibility_moderator_restore(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create community as user
  const community =
    await generate_random_reddit_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create post in the community
  const post = await generate_random_reddit_platform_user_posts_create(
    userConnection,
    {
      body: {
        type: "text",
        community_id: (community as IEntity).id,
        title: RandomGenerator.name(),
        content_text: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Create comment on the post
  const comment = await generate_random_reddit_platform_posts_comments_create(
    userConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditPlatformComment.ICreate,
      params: { postId: (post as IEntity).id },
    },
  );
  typia.assert(comment);
  // 5. Create moderator and assign to community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformModerator.IJoin,
  });
  const role =
    await generate_random_reddit_platform_moderator_communities_moderators_add(
      moderatorConnection,
      {
        body: {
          user_id: (
            comment as unknown as {
              author_id: string;
            }
          ).author_id,
          role: "moderator",
        } satisfies IRedditPlatformCommunityRole.ICreate,
        params: { communityId: (community as IEntity).id },
      },
    );
  typia.assert(role);
  // 6. Moderator hides the comment (sets deleted_at)
  const hiddenComment =
    await api.functional.redditPlatform.user.comments.visibility.updateVisibility(
      moderatorConnection,
      {
        commentId: (comment as IEntity).id,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IRedditPlatformComment.IVisibilityRequest,
      },
    );
  typia.assert(hiddenComment);
  // 7. Moderator restores comment visibility (sets deleted_at to null)
  const restoredComment =
    await api.functional.redditPlatform.user.comments.visibility.updateVisibility(
      moderatorConnection,
      {
        commentId: (comment as IEntity).id,
        body: {
          deleted_at: null,
        } satisfies IRedditPlatformComment.IVisibilityRequest,
      },
    );
  typia.assert(restoredComment);
  // 8. Validate restoration
  TestValidator.equals(
    "comment ID preserved after visibility restoration",
    (restoredComment as IEntity).id,
    (comment as IEntity).id,
  );
}
