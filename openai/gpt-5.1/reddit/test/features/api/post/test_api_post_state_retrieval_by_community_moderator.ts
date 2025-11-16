import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";

/**
 * Happy-path: community moderator retrieves lifecycle/moderation state for a
 * post.
 *
 * Business context
 *
 * - A regular member user joins the platform and creates a community.
 * - The same member user then creates a post in that community.
 * - Separately, a community moderator joins the platform (moderator-community
 *   association is assumed to be handled out-of-band according to the
 *   requirements).
 * - While authenticated as the community moderator, the test calls GET
 *   /communityPlatform/communityModerator/posts/{postId}/state to fetch the
 *   post’s lifecycle and moderation state.
 *
 * What this test validates
 *
 * 1. Member user join succeeds and returns an
 *    ICommunityPlatformMemberuser.IAuthorized envelope with tokens.
 * 2. Authenticated member user can create a community using
 *    ICommunityPlatformCommunity.ICreate.
 * 3. Authenticated member user can create a post in that community using
 *    ICommunityPlatformPost.ICreate, and we obtain a concrete post.id.
 * 4. Community moderator join succeeds and attaches an Authorization token to the
 *    connection.
 * 5. Authenticated moderator can successfully call
 *    api.functional.communityPlatform.communityModerator.posts.state.at with
 *    the created postId.
 * 6. The returned ICommunityPlatformPostState is structurally valid and refers to
 *    the same post_id as the created post.id.
 */
export async function test_api_post_state_retrieval_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://client.example.com/auth/join", // any valid URI
    referrer: "https://client.example.com/landing", // any valid URI
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Member user creates a community
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public", // plausible visibility level code
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Member user creates a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Register a community moderator (join)
  const moderatorJoinBody = {
    username: `mod-${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://client.example.com/auth/moderator/join",
    referrer: "https://client.example.com/moderation-info",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 5. Moderator fetches the post state
  const state: ICommunityPlatformPostState =
    await api.functional.communityPlatform.communityModerator.posts.state.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert<ICommunityPlatformPostState>(state);

  // Assertions: ensure the state belongs to our post
  TestValidator.equals(
    "post state should reference the created post id",
    state.post_id,
    post.id,
  );
}
