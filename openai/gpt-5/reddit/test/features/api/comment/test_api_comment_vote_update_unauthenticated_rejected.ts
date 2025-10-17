import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Ensure unauthenticated requests cannot update a comment vote.
 *
 * Business flow:
 *
 * 1. Register a member user (SDK attaches Authorization to the connection).
 * 2. Create a community (valid required fields with auto_archive_days ≥ 30).
 * 3. Create a TEXT post in the community (title/body meet length constraints).
 * 4. Create a comment under the post (body only).
 * 5. Clone the connection into an unauthenticated one (headers: {}).
 * 6. Attempt to update the comment vote with value=+1 using the unauthenticated
 *    connection and expect an error.
 *
 * Validations:
 *
 * - Typia.assert() on every successful response payload.
 * - Comment belongs to the created post (IDs match).
 * - Unauthenticated vote update throws an error (no status code assertions).
 */
export async function test_api_comment_vote_update_unauthenticated_rejected(
  connection: api.IConnection,
) {
  // 1) Register a member user
  const member = await api.functional.auth.memberUser.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12), // matches ^[A-Za-z0-9_]{3,20}$
      password: `a1${RandomGenerator.alphaNumeric(10)}`, // ensures letter+digit, 8-64 chars
      terms_accepted_at: new Date().toISOString(),
      privacy_accepted_at: new Date().toISOString(),
      marketing_opt_in: false,
    } satisfies ICommunityPlatformMemberUser.ICreate,
  });
  typia.assert(member);

  // 2) Create a community
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          name: `comm_${RandomGenerator.alphaNumeric(12)}`,
          visibility: "public",
          nsfw: false,
          auto_archive_days: 30,
          display_name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post under the community
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 5 }),
          type: "TEXT",
          body: RandomGenerator.content({ paragraphs: 1 }),
          nsfw: false,
          spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Create a comment under the post
  const comment =
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

  // Referential integrity: comment belongs to the created post
  TestValidator.equals(
    "comment belongs to the created post",
    comment.community_platform_post_id,
    post.id,
  );

  // 5) Build unauthenticated connection (do not touch headers afterwards)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 6) Attempt to update the vote without authentication → expect error
  await TestValidator.error(
    "unauthenticated comment vote update is rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.update(
        unauthConn,
        {
          commentId: comment.id,
          body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
        },
      );
    },
  );
}
