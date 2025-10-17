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

export async function test_api_post_create_unauthenticated_request_rejected(
  connection: api.IConnection,
) {
  /**
   * Validate unauthenticated rejection on post creation.
   *
   * Steps:
   *
   * 1. Register a member user to obtain an authenticated context
   * 2. Create a community using the authenticated context
   * 3. Build an unauthenticated connection (empty headers)
   * 4. Prepare a valid TEXT post creation body
   * 5. Attempt to create a post using the unauthenticated connection and assert
   *    error
   * 6. Retry with the authenticated connection; assert success and key field
   *    integrity
   */
  // 1) Register a member user (token is set into connection automatically by SDK)
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: typia.random<ICommunityPlatformMemberUser.ICreate>(),
  });
  typia.assert(authorized);

  // 2) Create a community with valid constraints
  const communityCreateBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: RandomGenerator.pick([
      "public",
      "restricted",
      "private",
    ] as const),
    nsfw: false,
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3) Build unauthenticated connection (never manipulate the original headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Prepare a valid TEXT post creation body
  const textPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.content({ paragraphs: 2 }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  // 5) Attempt unauthenticated creation → must throw (no status code assertion)
  await TestValidator.error(
    "unauthenticated post creation should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.posts.create(
        unauthConn,
        {
          communityId: community.id,
          body: textPostBody,
        },
      );
    },
  );

  // 6) Authenticated creation succeeds with the same payload
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: textPostBody,
      },
    );
  typia.assert(post);

  // Business integrity checks
  TestValidator.equals(
    "created post belongs to the target community",
    post.community_platform_community_id,
    community.id,
  );
  TestValidator.equals(
    "created post title equals input",
    post.title,
    textPostBody.title,
  );
  TestValidator.equals("created post type is TEXT", post.type, "TEXT");
}
