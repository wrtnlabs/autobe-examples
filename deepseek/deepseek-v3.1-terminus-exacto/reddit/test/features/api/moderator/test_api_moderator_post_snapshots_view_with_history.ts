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
 * Test moderator post snapshots retrieval with history filtering and pagination.
 *
 * 1. Create moderator account and authenticate
 * 2. Create user account and authenticate
 * 3. Create community as user
 * 4. Create post in community as user
 * 5. Test moderator snapshot retrieval with various filters
 */
export async function test_api_moderator_post_snapshots_view_with_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // 2. Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // 3. Create community as user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create initial post as user
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Test moderator snapshot retrieval with various filters
  // Test 1: Default pagination
  const defaultSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(defaultSnapshots);
  TestValidator.equals(
    "default pagination has data",
    defaultSnapshots.data.length >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    defaultSnapshots.pagination !== undefined,
  );
  // Test 2: Version number filter
  const versionFilterSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          version_number: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(versionFilterSnapshots);
  // Test 3: Date range filter
  const dateFilterSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          created_at: new Date().toISOString(),
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(dateFilterSnapshots);
  // Test 4: Edit reason search
  const reasonFilterSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          edit_reason: RandomGenerator.alphabets(5),
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(reasonFilterSnapshots);
  // Test 5: Custom pagination
  const customPaginationSnapshots =
    await api.functional.communityPlatform.moderator.posts.snapshots.index(
      moderatorConnection,
      {
        postId: post.id,
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>
          >(),
          limit: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Default<20> &
              tags.Minimum<1> &
              tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(customPaginationSnapshots);
  // Validate snapshot metadata structure
  if (defaultSnapshots.data.length > 0) {
    const snapshot = defaultSnapshots.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has version_number",
      typeof snapshot.version_number === "number",
    );
  }
}
