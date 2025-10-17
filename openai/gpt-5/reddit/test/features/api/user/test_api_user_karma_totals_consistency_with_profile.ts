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
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Verify public accessibility and consistency of user karma totals.
 *
 * Scenario rewrite note: The original plan requested comparing the karma
 * snapshot with the profile-embedded karma. However, the profile endpoint is
 * not available in the provided SDK. Therefore, this test validates that:
 *
 * 1. A newly joined user can author minimal content (community, TEXT post,
 *    top-level comment) using authenticated APIs.
 * 2. The karma snapshot endpoint works publicly (no auth) and returns a valid
 *    payload.
 * 3. The public karma snapshot equals the same payload retrieved with an
 *    authenticated connection.
 *
 * Steps:
 *
 * 1. Join a member user (capture userId; auth token auto-installed on connection)
 * 2. Create a public community
 * 3. Create a TEXT post in the community
 * 4. Create a top-level comment on the post
 * 5. Build an unauthenticated connection and call users/{userId}/karma
 * 6. Call the same karma endpoint with the authenticated connection
 * 7. Assert both responses are equal and conform to the DTO schema
 */
export async function test_api_user_karma_totals_consistency_with_profile(
  connection: api.IConnection,
) {
  // 1) Register a new member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12),
    password: "Passw0rd!", // 8–64 chars, includes letters and digits
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const me: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(me);

  // 2) Create a community (requires authenticated connection)
  const communityBody = {
    name: `c-${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in that community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.ITEXT;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5) Public (unauthenticated) connection
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 6) Fetch karma with public connection
  const publicKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.users.karma.at(publicConn, {
      userId: me.id,
    });
  typia.assert(publicKarma);

  // 7) Fetch karma with authenticated connection and compare
  const authedKarma: ICommunityPlatformUserKarma =
    await api.functional.communityPlatform.users.karma.at(connection, {
      userId: me.id,
    });
  typia.assert(authedKarma);

  TestValidator.equals(
    "public and authenticated karma payloads are equal",
    publicKarma,
    authedKarma,
  );
}
