import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_listing_private_access_denied(
  connection: api.IConnection,
) {
  /**
   * Validate that listing posts of a PRIVATE community is not accessible to a
   * public viewer.
   *
   * Steps:
   *
   * 1. Register a fresh member user to obtain authenticated context
   * 2. Create a PRIVATE community
   * 3. Seed multiple posts in the private community
   * 4. Attempt to list posts with a public (unauthenticated) connection and expect
   *    an error
   */

  // 1) Register a fresh member user (token is automatically managed by SDK)
  const memberJoinBody = typia.random<ICommunityPlatformMemberUser.ICreate>();
  const memberAuth = await api.functional.auth.memberUser.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);

  // 2) Create a PRIVATE community as the authenticated member
  const communityCreateBody = {
    name: `priv_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "private",
    nsfw: false,
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
    language: "en",
    region: "KR",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with private visibility",
    community.visibility,
    "private",
  );

  // 3) Seed multiple posts in the private community
  await ArrayUtil.asyncRepeat(3, async (index) => {
    const postCreateBody = typia.random<ICommunityPlatformPost.ICreate>();
    const post =
      await api.functional.communityPlatform.memberUser.communities.posts.create(
        connection,
        {
          communityId: community.id,
          body: postCreateBody,
        },
      );
    typia.assert(post);
    TestValidator.equals(
      `seeded post ${index + 1} belongs to created community`,
      post.community_platform_community_id,
      community.id,
    );
  });

  // 4) Public viewer (no Authorization) tries to list private community posts
  const publicConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "public viewer cannot list private community posts",
    async () => {
      await api.functional.communityPlatform.communities.posts.index(
        publicConnection,
        { communityId: community.id },
      );
    },
  );
}
