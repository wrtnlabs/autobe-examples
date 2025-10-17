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

export async function test_api_post_detail_private_access_denied(
  connection: api.IConnection,
) {
  /**
   * Validate that a post from a PRIVATE community cannot be retrieved by an
   * unauthenticated viewer.
   *
   * Steps:
   *
   * 1. Register a new member (join) and become authenticated.
   * 2. Create a PRIVATE community.
   * 3. Create a TEXT post inside that private community.
   * 4. Confirm the authenticated creator can view the post detail successfully.
   * 5. Attempt to read the post without Authorization and expect an error (no
   *    status code assertion).
   */

  // 1) Register a new member user and authenticate
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10), // matches ^[A-Za-z0-9_]{3,20}$
    password: `a1${RandomGenerator.alphaNumeric(10)}`,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const me: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(me);

  // 2) Create a PRIVATE community
  const communityCreateBody = {
    name: `priv_${RandomGenerator.alphaNumeric(8)}`,
    visibility: "private",
    nsfw: false,
    auto_archive_days: 30,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);
  TestValidator.equals(
    "community is marked as private",
    community.visibility,
    "private",
  );

  // 3) Create a TEXT post in that private community
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // 4) Authenticated creator can view the post detail successfully
  const visible: ICommunityPlatformPost =
    await api.functional.communityPlatform.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(visible);
  TestValidator.equals(
    "authorized read returns the created post",
    visible.id,
    post.id,
  );

  // 5) Unauthenticated viewer must not be able to read the private post
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated viewer cannot access private post detail",
    async () => {
      await api.functional.communityPlatform.posts.at(unauthConn, {
        postId: post.id,
      });
    },
  );
}
