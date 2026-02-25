import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
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
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test the edge case where a post exists but has no edit history snapshots.
 * Authenticate as a moderator, create a community, create a fresh post without any edits,
 * then attempt to retrieve snapshots for this post. Validate that the response returns
 * an empty data array (no snapshots) but with correct pagination metadata showing
 * zero records. This tests the system's ability to handle the boundary condition
 * where no historical edits exist yet, ensuring graceful response rather than errors.
 */
export async function test_api_moderator_post_snapshots_no_history(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator-specific connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as moderator
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Create user-specific connection for community and post creation
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123" satisfies string & tags.Format<"password">,
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create a fresh post without any edits
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({
          sentences: 3,
        }) satisfies string & tags.MinLength<10>,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve snapshots for the post (should be empty)
  const snapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Default<1> &
            tags.Minimum<1>,
          limit: 20 satisfies number &
            tags.Type<"int32"> &
            tags.Default<20> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate empty data array
  TestValidator.equals("data array should be empty", snapshots.data, []);
  // Validate pagination metadata
  TestValidator.equals(
    "records count should be 0",
    snapshots.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    snapshots.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 20", snapshots.pagination.limit, 20);
}
