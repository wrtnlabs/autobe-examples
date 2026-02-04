import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_update_by_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create main author user
  const mainAuthorConnection: api.IConnection = { host: connection.host };
  const mainAuthor: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(mainAuthorConnection, {});
  // 2. Create community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create(
      mainAuthorConnection,
      {},
    );
  // 3. Create post in community
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_user_posts_create(
      mainAuthorConnection,
      {
        body: {
          community_id: (community as { id: string }).id,
        },
      },
    );
  // 4. Create comment as author
  const comment: ICommunityPlatformComment =
    await generate_random_community_platform_user_posts_comments_create(
      mainAuthorConnection,
      {
        params: { postId: (post as { id: string }).id },
        body: {
          content: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // 5. Create non-author user
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthor: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(nonAuthorConnection, {});
  // 6. Attempt to update comment as non-author user
  await TestValidator.error(
    "Non-author user cannot update comment",
    async () => {
      await api.functional.communityPlatform.user.posts.comments.update(
        nonAuthorConnection,
        {
          postId: (post as { id: string }).id,
          commentId: (comment as { id: string }).id,
          body: {
            content: RandomGenerator.paragraph(),
          } satisfies ICommunityPlatformComment.IUpdate,
        },
      );
    },
  );
}