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

/**
 * Validate idempotent behavior of clearing a post vote when no active vote
 * exists.
 *
 * Business goal: Ensure DELETE
 * /communityPlatform/memberUser/posts/{postId}/vote succeeds even if the
 * current user has not voted yet, and that repeating the same DELETE remains
 * idempotent without errors or state changes.
 *
 * Steps:
 *
 * 1. Join as a member user to obtain an authenticated session.
 * 2. Create a community with valid visibility and archival settings.
 * 3. Create a TEXT post in that community.
 * 4. Call DELETE vote once (no prior vote set) and expect success.
 * 5. Call DELETE vote again to confirm idempotency (still succeeds without error).
 */
export async function test_api_post_vote_clear_idempotent_no_active_vote(
  connection: api.IConnection,
) {
  // 1) Authenticate as a member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    password: RandomGenerator.alphaNumeric(12),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a community
  const communityBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility: "public" as IECommunityVisibility,
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

  // 3) Create a TEXT post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    type: "TEXT" as const,
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 8,
    }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // 4) First erase: no active vote exists yet, should succeed
  await api.functional.communityPlatform.memberUser.posts.vote.erase(
    connection,
    { postId: post.id },
  );
  TestValidator.predicate(
    "first erase completes successfully without an active vote",
    true,
  );

  // 5) Second erase: must be idempotent and still succeed
  await api.functional.communityPlatform.memberUser.posts.vote.erase(
    connection,
    { postId: post.id },
  );
  TestValidator.predicate(
    "second erase remains idempotent and succeeds without error",
    true,
  );
}
