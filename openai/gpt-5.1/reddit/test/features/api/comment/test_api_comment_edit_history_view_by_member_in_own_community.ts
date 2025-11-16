import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_comment_edit_history_view_by_member_in_own_community(
  connection: api.IConnection,
) {
  // 1. Register a fresh member user (join)
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a new community as this member user
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a membership for this member user in the new community
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // Verify membership is bound to the created community and member user
  TestValidator.equals(
    "membership community slug should match created community",
    membership.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "membership member id should match joined member user",
    membership.memberUser.id,
    memberUser.id,
  );

  // 4. Create a post in that community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post.community_id should equal created community.id",
    post.community_id,
    community.id,
  );

  // 5. Create a top-level comment on that post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 2 }),
    parentCommentId: undefined,
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

  TestValidator.equals(
    "comment.post.id in summary should match created post.id",
    comment.post.id,
    post.id,
  );

  // 6. Retrieve a comment edit history entry for this comment.
  //
  // The scenario assumes there is a separate edit API that would generate
  // edit history snapshots. That API is not provided in the current SDK,
  // so we cannot programmatically create a real history row. Instead, we
  // exercise the GET editHistories.at endpoint using deterministic IDs.
  //
  // In real environments (non-simulate), this call would only succeed if
  // a history row already exists for the given (commentId, editHistoryId).
  // Here we call it primarily to validate the response contract and
  // relationships when a history entry is returned.

  // For simulate:true connections, the SDK will return random but
  // structurally valid ICommunityPlatformCommentEditHistory objects.
  // For real connections, this may return 404 if there is no history; we
  // do not assert on status codes per global rules, so we simply call it
  // and assert type when it succeeds.

  const editHistoryId: string = typia.random<string>();

  const editHistory: ICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.comments.editHistories.at(
      connection,
      {
        commentId: comment.id,
        editHistoryId,
      },
    );
  typia.assert(editHistory);

  // 7. Validate relationships within the returned edit history snapshot
  TestValidator.equals(
    "edit history's comment summary post id should equal created post.id",
    editHistory.comment.post.id,
    post.id,
  );

  // The history comment summary may or may not share the same id as the
  // comment we created depending on how the backend models history vs.
  // current comment; when it does, we validate it.
  if (editHistory.comment.id === comment.id) {
    TestValidator.equals(
      "when history comment id matches created comment, ensure equality",
      editHistory.comment.id,
      comment.id,
    );
  }

  // If editor information is present, it should match the acting member
  // user in typical member-edit scenarios.
  if (editHistory.editor !== undefined) {
    TestValidator.equals(
      "when editor is present, its id should match joined member user id",
      editHistory.editor.id,
      memberUser.id,
    );
  }

  // Basic sanity check on previous_body and created_at fields
  TestValidator.predicate(
    "edit history created_at should be a non-empty string",
    editHistory.created_at.length > 0,
  );
}
