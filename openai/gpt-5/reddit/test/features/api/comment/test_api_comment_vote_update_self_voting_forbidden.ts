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
 * Verify that a member user cannot vote on their own comment.
 *
 * Business flow:
 *
 * 1. Register a member user (User A)
 * 2. Create a community
 * 3. Create a TEXT post in the community
 * 4. Create a top-level comment authored by User A
 * 5. Attempt to vote (+1) on the comment by the same User A and expect failure
 *
 * Assertions:
 *
 * - Post belongs to the created community
 * - Comment author matches the authenticated user
 * - Self-voting attempt results in an error (forbidden by business rule)
 */
export async function test_api_comment_vote_update_self_voting_forbidden(
  connection: api.IConnection,
) {
  // 1) Register a member user (User A)
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(12), // 3-20 chars, letters allowed by pattern
    password: `${RandomGenerator.alphaNumeric(8)}A1`, // ensure at least one letter and one number
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const user: ICommunityPlatformMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: createUserBody,
    });
  typia.assert(user);

  // 2) Create a community
  const createCommunityBody = {
    name: `c_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    nsfw: false,
    auto_archive_days: 30, // minimum allowed
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    type: "TEXT",
    body: RandomGenerator.paragraph({ sentences: 12 }),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.ITEXT;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: createPostBody,
      },
    );
  typia.assert(post);

  // Relational sanity check: post belongs to created community
  TestValidator.equals(
    "post belongs to the created community",
    post.community_platform_community_id,
    community.id,
  );

  // 4) Create a top-level comment authored by User A
  const createCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: createCommentBody,
      },
    );
  typia.assert(comment);

  // Relational sanity check: comment author is the authenticated user
  TestValidator.equals(
    "comment author matches authenticated user",
    comment.community_platform_user_id,
    user.id,
  );

  // 5) Attempt self-vote (+1) on own comment → must fail
  await TestValidator.error(
    "self-voting on own comment must be forbidden",
    async () => {
      await api.functional.communityPlatform.memberUser.comments.vote.update(
        connection,
        {
          commentId: comment.id,
          body: { value: 1 } satisfies ICommunityPlatformCommentVote.IUpdate,
        },
      );
    },
  );
}
