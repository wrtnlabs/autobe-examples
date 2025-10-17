import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Public user profile retrieval with authored content visibility.
 *
 * Validates that a user’s public profile can be retrieved without
 * authentication and that it includes only public-safe fields along with
 * authored content summaries created earlier in this flow.
 *
 * Steps:
 *
 * 1. Register a new member user (join) – capture userId and authenticate SDK
 *    connection.
 * 2. Create a community as the member user.
 * 3. Create a TEXT post in that community authored by the same user.
 * 4. Create a top-level comment under the created post by the same user.
 * 5. Call GET /communityPlatform/users/{userId}/profile WITHOUT Authorization
 *    header using a fresh connection with empty headers.
 * 6. Assertions: schema adherence, profile.id equals userId, authored post &
 *    comment appear in summaries with correct relational ids, karma object
 *    exists.
 */
export async function test_api_user_profile_public_retrieval_with_authored_content(
  connection: api.IConnection,
) {
  // 1) Register a brand-new member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = `u_${RandomGenerator.alphaNumeric(10)}`; // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = `P${RandomGenerator.alphaNumeric(7)}1${RandomGenerator.alphaNumeric(2)}`; // >= 8 chars, letters+digits
  const nowIso: string = new Date().toISOString();

  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email,
        username,
        password,
        terms_accepted_at: nowIso,
        privacy_accepted_at: nowIso,
        marketing_opt_in: false,
      } satisfies ICommunityPlatformMemberUser.ICreate,
    });
  typia.assert(authorized);

  // 2) Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `c_${RandomGenerator.alphaNumeric(12)}`,
          display_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          language: "en",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          type: "TEXT",
          body: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 16,
          }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate.ITEXT,
      },
    );
  typia.assert(post);

  // 4) Create a top-level comment under the created post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Retrieve profile without authentication (public access)
  const guestConn: api.IConnection = { ...connection, headers: {} }; // do not touch headers afterwards
  const profile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.users.profile.at(guestConn, {
      userId: authorized.id,
    });
  typia.assert(profile);

  // 6) Business validations
  // Profile id equals target user id
  TestValidator.equals(
    "profile id equals created user id",
    profile.id,
    authorized.id,
  );

  // Username exists (non-empty string) – public-safe field
  TestValidator.predicate(
    "profile username is non-empty string",
    typeof profile.username === "string" && profile.username.length > 0,
  );

  // Authored post is listed with correct community reference
  const foundPost = profile.posts.find((p) => p.id === post.id);
  TestValidator.predicate(
    "authored post appears in profile summaries",
    foundPost !== undefined,
  );
  if (foundPost) {
    TestValidator.equals(
      "profile post summary community id matches",
      foundPost.community_platform_community_id,
      community.id,
    );
  }

  // Authored comment is listed with correct post reference
  const foundComment = profile.comments.find((c) => c.id === comment.id);
  TestValidator.predicate(
    "authored comment appears in profile summaries",
    foundComment !== undefined,
  );
  if (foundComment) {
    TestValidator.equals(
      "profile comment summary post id matches",
      foundComment.community_platform_post_id,
      post.id,
    );
  }

  // Karma object exists (schema already asserted). No specific value assertions.
  TestValidator.predicate(
    "profile karma object exists",
    profile.karma !== null && profile.karma !== undefined,
  );
}
