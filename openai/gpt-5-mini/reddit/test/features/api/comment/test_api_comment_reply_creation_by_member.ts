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

export async function test_api_comment_reply_creation_by_member(
  connection: api.IConnection,
) {
  /**
   * Validate nested reply creation by a newly joined community member.
   *
   * NOTE (scenario adaptation): The original scenario requested verifying
   * append-only comment snapshots and notification queue side-effects in the
   * DB. The provided SDK does not expose endpoints for comment snapshots or
   * notifications. Therefore this test verifies all observable, API-level
   * invariants implementable with the available functions: correct parent
   * linkage and post association, and expected failure modes (non-existent
   * parent, body length validation).
   *
   * Steps:
   *
   * 1. Join community member (self-join)
   * 2. Create a community
   * 3. Create a post
   * 4. Create a parent comment
   * 5. Create a reply and validate parent/post linkage
   * 6. Negative tests: non-existent parent and too-long body
   */

  // 1) Register / join a new community member
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email,
    username,
    password: "Passw0rd1",
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/ref",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Create a community (unique slug)
  const slug = `test-community-${Date.now()}`;
  const communityBody = {
    name: `Test Community ${RandomGenerator.name(1)}`,
    slug,
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
  TestValidator.equals("created community slug matches", community.slug, slug);

  // 3) Create a post in the community
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
  TestValidator.predicate("post has id", typeof post.id === "string");

  // 4) Create a parent comment on the post
  const parentCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityBbsComment.ICreate;

  const parentComment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment references post",
    parentComment.community_bbs_post_id,
    post.id,
  );

  // 5) Create a reply to the parent comment
  const replyBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityBbsComment.ICreate;

  const reply: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.comments.replies.create(
      connection,
      {
        commentId: parentComment.id,
        body: replyBody,
      },
    );
  typia.assert(reply);

  TestValidator.equals(
    "reply parent linkage",
    reply.parent_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply belongs to same post",
    reply.community_bbs_post_id,
    post.id,
  );

  // 6a) Negative: Replying to a non-existent comment should fail
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "reply to non-existent comment should fail",
    async () => {
      await api.functional.communityBbs.communityMember.comments.replies.create(
        connection,
        {
          commentId: nonExistentId,
          body: replyBody,
        },
      );
    },
  );

  // 6b) Negative: Reply body exceeding max length (10,000) should fail
  const longBody = {
    body: "a".repeat(10001),
  } satisfies ICommunityBbsComment.ICreate;
  await TestValidator.error(
    "reply with too-long body should fail",
    async () => {
      await api.functional.communityBbs.communityMember.comments.replies.create(
        connection,
        {
          commentId: parentComment.id,
          body: longBody,
        },
      );
    },
  );
}
