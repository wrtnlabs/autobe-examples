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
 * Verify that memberUser tokens cannot access moderator-only post state
 * endpoint.
 *
 * Business context: The community platform exposes a moderator-focused endpoint
 * GET /communityPlatform/communityModerator/posts/{postId}/state that returns
 * ICommunityPlatformPostState, representing lifecycle and moderation state of a
 * post. This surface must only be visible to the communityModerator actor. A
 * regular memberUser, even if they authored the post, must not be able to call
 * this endpoint successfully.
 *
 * Test steps:
 *
 * 1. Register a member user (auth.memberUser.join) to obtain a memberUser session
 *    and Authorization header bound to that actor.
 * 2. Using that memberUser session, create a community
 *    (communityPlatform.memberUser.communities.create) with valid
 *    ICommunityPlatformCommunity.ICreate payload.
 * 3. Using the same member user, create a post in that community
 *    (communityPlatform.memberUser.posts.create) with a valid
 *    ICommunityPlatformPost.ICreate payload.
 * 4. Still authenticated as the memberUser (never logging in as a
 *    communityModerator), call the moderator endpoint
 *    communityPlatform.communityModerator.posts.state.at with the created
 *    post.id as postId.
 * 5. Assert that the call fails (throws) when using a memberUser token, validating
 *    that RBAC prevents memberUser from reading moderator state.
 *
 * Expectations:
 *
 * - The state.at call MUST NOT succeed under a memberUser token; it must throw
 *   some HttpError or equivalent error.
 * - The test MUST NOT assert specific HTTP status codes; only that an error is
 *   thrown.
 * - Because the call is expected to fail, the test must not attempt to
 *   typia.assert() on a successful ICommunityPlatformPostState response.
 * - The main focus is verifying that the actor boundary between memberUser and
 *   communityModerator is enforced for the post state endpoint.
 */
export async function test_api_post_state_access_denied_for_non_moderator_token_on_moderator_route(
  connection: api.IConnection,
) {
  // 1. Register a member user and obtain memberUser session (Authorization header)
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinInput,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as this member user
  const communityCreateInput = {
    identifier: RandomGenerator.alphabets(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateInput,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community as the same member user
  const postTypeId = typia.random<string & tags.Format<"uuid">>();

  const postCreateInput = {
    community_id: community.id,
    post_type_id: postTypeId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateInput,
    });
  typia.assert(post);

  // 4. While still authenticated as memberUser (do NOT login as communityModerator),
  //    attempt to call the moderator-only post state endpoint.
  await TestValidator.error(
    "memberUser token must not access moderator post state endpoint",
    async () => {
      await api.functional.communityPlatform.communityModerator.posts.state.at(
        connection,
        {
          postId: post.id,
        },
      );
    },
  );
}
