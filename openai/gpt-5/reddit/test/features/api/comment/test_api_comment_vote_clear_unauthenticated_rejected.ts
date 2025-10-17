import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Ensure unauthenticated comment vote clearing is rejected and that
 * authenticated clearing works idempotently.
 *
 * Business flow:
 *
 * 1. Register a member user to authenticate (token applied by SDK)
 * 2. Create a community (valid visibility, nsfw, and auto_archive_days ≥ 30)
 * 3. Create a TEXT post under the community
 * 4. Create a comment under the post
 * 5. Attempt to clear vote using an unauthenticated connection -> expect error
 * 6. Clear vote using authenticated connection -> success
 * 7. Clear vote again -> idempotent success (no error)
 */
export async function test_api_comment_vote_clear_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Register and authenticate a member user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.name(1); // 3-7 letters, fits pattern
  const password: string = `${RandomGenerator.alphabets(6)}1aA`; // >=8, includes letters and digits
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as any;

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
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          display_name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post under the community
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
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPost.ICreate.ITEXT,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to created community",
    post.community_platform_community_id,
    community.id,
  );

  // 4) Create a comment under the post
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment belongs to created post",
    comment.community_platform_post_id,
    post.id,
  );

  // 5) Attempt unauthenticated vote clear -> expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated comment vote clear must be rejected",
    async () =>
      await api.functional.communityPlatform.memberUser.comments.vote.erase(
        unauthConn,
        { commentId: comment.id },
      ),
  );

  // 6) Authenticated erase succeeds
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );

  // 7) Idempotency: repeat erase succeeds without error
  await api.functional.communityPlatform.memberUser.comments.vote.erase(
    connection,
    { commentId: comment.id },
  );
}
