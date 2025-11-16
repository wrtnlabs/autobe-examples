import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

/**
 * Ensure memberUser authorization is required to create post votes.
 *
 * Business goal
 *
 * - Verify that the postVotes.create endpoint under the memberUser actor can only
 *   be used by authenticated member users.
 * - Demonstrate that unauthenticated calls and calls authenticated as
 *   platformAdmin are rejected while a properly authenticated memberUser can
 *   create a vote successfully.
 *
 * High level flow
 *
 * 1. Prepare actors and configuration
 *
 *    - Register a member user via auth.memberUser.join.
 *    - Register a platform admin via auth.platformAdmin.join.
 *    - As platformAdmin, create a community visibility level.
 *    - As memberUser, create a community using that visibility level code.
 *    - As platformAdmin, create a post type.
 *    - As memberUser, create a post in the community with that post type.
 * 2. Authorization negative cases for postVotes.create
 *
 *    - Call postVotes.create with no Authorization header at all, expecting an
 *         authorization failure and no usable ICommunityPlatformPostVote
 *         result.
 *    - Call postVotes.create while authenticated as platformAdmin, expecting the
 *         same kind of authorization failure.
 * 3. Positive case for postVotes.create
 *
 *    - Authenticate (or remain) as the memberUser and call postVotes.create with a
 *         valid ICommunityPlatformPostVote.ICreate payload.
 *    - Assert that the call succeeds and returns a valid ICommunityPlatformPostVote
 *         bound to the expected post and member user.
 *
 * Constraints and notes
 *
 * - Use only provided SDK functions and DTOs. Do not assume additional APIs like
 *   `get` or `list` for post votes.
 * - Do not manipulate `connection.headers` directly; rely on auth SDK functions
 *   to manage Authorization state.
 * - For the unauthenticated case, construct a fresh IConnection object that omits
 *   headers entirely.
 * - Use TestValidator.error for negative cases but do not depend on concrete HTTP
 *   status codes.
 * - Use typia.assert on successful responses to validate DTO shape.
 */
export async function test_api_post_vote_create_authorization_required_for_member_user(
  connection: api.IConnection,
) {
  // 1. Register member user (this also authenticates as that memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuth);

  // 2. Register platform admin (this authenticates as platformAdmin, swapping actor)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. As platformAdmin, create a visibility level
  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "created visibility level code should match input",
    visibility.code,
    visibilityCode,
  );

  // 4. Switch back to member user (login as memberUser ensures actor context)
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: memberJoinBody.ip,
    href: memberJoinBody.href,
    referrer: memberJoinBody.referrer,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuth: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  // 5. As member user, create a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match input",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 6. Switch to platformAdmin again and create a post type
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminLoginAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  const postTypeCode = `text-${RandomGenerator.alphabets(5)}`;
  const postTypeBody = {
    code: postTypeCode,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(postType);
  TestValidator.equals(
    "post type code should match input",
    postType.code,
    postTypeCode,
  );

  // 7. Switch back to member user to create a post
  const memberLoginAuth2: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth2);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community id should match community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post type id should match created post type",
    post.postType.id,
    postType.id,
  );

  // Prepare a valid vote body for later reuse
  const voteBody = {
    community_platform_post_id: post.id,
    vote_value: 1,
  } satisfies ICommunityPlatformPostVote.ICreate;

  // 8. Negative case 1: unauthenticated call
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
    headers: {},
  };

  await TestValidator.error(
    "postVotes.create should fail without authentication",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.create(
        unauthenticatedConnection,
        {
          body: voteBody,
        },
      );
    },
  );

  // 9. Negative case 2: wrong-role token (platformAdmin)
  const adminLoginAuth2: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth2);

  await TestValidator.error(
    "postVotes.create should fail when authenticated as platformAdmin",
    async () => {
      await api.functional.communityPlatform.memberUser.postVotes.create(
        connection,
        {
          body: voteBody,
        },
      );
    },
  );

  // 10. Positive case: authenticated memberUser can create a vote
  const memberLoginAuth3: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth3);

  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.postVotes.create(
      connection,
      {
        body: voteBody,
      },
    );
  typia.assert(vote);

  TestValidator.equals(
    "created vote should target the expected post",
    vote.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "vote_value should match request",
    vote.vote_value,
    voteBody.vote_value,
  );
}
