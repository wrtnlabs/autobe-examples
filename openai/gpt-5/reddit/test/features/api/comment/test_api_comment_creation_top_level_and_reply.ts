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
 * Validate top-level and nested comment creation on a post by an authenticated
 * member user.
 *
 * Steps:
 *
 * 1. Register a fresh member user (join) to obtain authentication in the
 *    connection.
 * 2. Create a community with valid required fields.
 * 3. Create a TEXT-type post within the created community.
 * 4. Create a top-level comment (no parent_id) under the post.
 * 5. Create a reply comment with parent_id set to the top-level comment's id under
 *    the same post.
 *
 * Validations:
 *
 * - All responses conform to DTO schemas via typia.assert().
 * - The top-level comment belongs to the created post and is authored by the
 *   joined member.
 * - The reply comment has parent_id equal to the top-level comment's id and
 *   belongs to the same post.
 * - Edit_count is non-negative for both comments (initialization check without
 *   assuming exact value).
 */
export async function test_api_comment_creation_top_level_and_reply(
  connection: api.IConnection,
) {
  // 1) Register a fresh member user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.MaxLength<64> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">
    >(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const member = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(member);

  // 2) Create a community
  const communityBody = {
    name: `comm_${RandomGenerator.alphaNumeric(12)}`,
    visibility: RandomGenerator.pick([
      "public",
      "restricted",
      "private",
    ] as const),
    nsfw: false,
    auto_archive_days: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<30>
    >(),
    display_name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    language: "en",
    region: "KR",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create a TEXT post in the community
  const postBody = {
    title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
    type: "TEXT" as const,
    body: typia.random<string & tags.MinLength<1> & tags.MaxLength<40000>>(),
    nsfw: false,
    spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate.ITEXT;
  const post =
    await api.functional.communityPlatform.memberUser.communities.posts.create(
      connection,
      { communityId: community.id, body: postBody },
    );
  typia.assert(post);

  // 4) Create a top-level comment (no parent_id)
  const topCommentBody = {
    body: typia.random<string & tags.MinLength<1> & tags.MaxLength<10000>>(),
    parent_id: null,
  } satisfies ICommunityPlatformComment.ICreate;
  const topComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: topCommentBody },
    );
  typia.assert(topComment);

  // 5) Create a nested reply under the top-level comment
  const replyCommentBody = {
    body: typia.random<string & tags.MinLength<1> & tags.MaxLength<10000>>(),
    parent_id: topComment.id,
  } satisfies ICommunityPlatformComment.ICreate;
  const replyComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      { postId: post.id, body: replyCommentBody },
    );
  typia.assert(replyComment);

  // Business logic validations
  TestValidator.equals(
    "top-level comment belongs to target post",
    topComment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "top-level comment authored by joined member",
    topComment.community_platform_user_id,
    member.id,
  );
  TestValidator.equals(
    "reply belongs to same post",
    replyComment.community_platform_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply parent equals top-level comment id",
    replyComment.parent_id,
    topComment.id,
  );
  TestValidator.predicate(
    "top-level edit_count is non-negative",
    topComment.edit_count >= 0,
  );
  TestValidator.predicate(
    "reply edit_count is non-negative",
    replyComment.edit_count >= 0,
  );
}
