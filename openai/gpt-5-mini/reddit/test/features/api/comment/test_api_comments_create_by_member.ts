import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_comments_create_by_member(
  connection: api.IConnection,
) {
  /**
   * E2E: Create a community member, create a community, create a post in the
   * community, then create a top-level comment on that post.
   *
   * Verifications:
   *
   * - Responses are asserted with typia.assert()
   * - Request bodies use the `satisfies` pattern for correct DTO types
   * - Business validations: comment body matches request, comment.author.username
   *   matches the created member, comment.community.slug matches created
   *   community, and created_at is present
   *
   * Note: The original requirement to assert post.comment_count increment and
   * snapshots could not be implemented because the provided SDK does not
   * include a GET/read endpoint for posts after comment creation. This test
   * therefore validates observable referential integrity and author attribution
   * instead.
   */

  // 1) Register a new community member
  const email = typia.random<string & tags.Format<"email">>();
  const username = `testuser_${RandomGenerator.alphaNumeric(6)}`.slice(0, 21);
  const joinBody = {
    email,
    username,
    password: "StrongP@ss1",
    profile: { display_name: RandomGenerator.name() },
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);
  const member = auth.member;

  // 2) Create a new community using the authenticated member
  const communitySlug = `test-community-${Date.now()}`;
  const communityBody = {
    name: `Test ${RandomGenerator.name(2)}`,
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3) Create a new post in the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);

  // 4) Create a top-level comment on the post
  const commentRequest = {
    body: "Test comment content",
  } satisfies ICommunityBbsComment.ICreate;

  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentRequest,
      },
    );
  typia.assert(comment);

  // 5) Validations
  TestValidator.equals(
    "comment body matches request",
    comment.body,
    commentRequest.body,
  );
  TestValidator.equals(
    "comment author username matches created member",
    comment.author.username,
    member.username,
  );
  TestValidator.equals(
    "comment is linked to the expected community",
    comment.community.slug,
    community.slug,
  );
  TestValidator.predicate(
    "comment has created_at timestamp",
    comment.created_at !== null && comment.created_at !== undefined,
  );
}
