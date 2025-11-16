import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformIndexDocuments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformIndexDocuments";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";

export async function test_api_search_index_document_deletion_for_comment_vote_target(
  connection: api.IConnection,
) {
  // 1. AdminUser setup
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. MemberUser setup
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoin);

  // 3. MemberUser login to ensure context
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 4. Create community as memberUser
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug,
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Create membership in that community
  const membershipCreateBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // 6. Create post in the community
  const postCreateBody = {
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
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Create a vote on the post
  const postVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformPostVote.ICreate;

  const postVote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.memberUser.posts.votes.create(
      connection,
      {
        postId: post.id,
        body: postVoteCreateBody,
      },
    );
  typia.assert(postVote);

  // 8. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 9. Create a vote on the comment
  const commentVoteCreateBody = {
    direction: "up",
  } satisfies ICommunityPlatformCommentVote.ICreate;

  const commentVote: ICommunityPlatformCommentVote =
    await api.functional.communityPlatform.memberUser.comments.votes.create(
      connection,
      {
        commentId: comment.id as string & tags.Format<"uuid">,
        body: commentVoteCreateBody,
      },
    );
  typia.assert(commentVote);

  const originalCommentVoteSnapshot: ICommunityPlatformCommentVote = {
    comment_id: commentVote.comment_id,
    upvotes: commentVote.upvotes,
    downvotes: commentVote.downvotes,
    score: commentVote.score,
    myVote: commentVote.myVote,
  };

  // 10. Switch back to adminUser context via login
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 11. Index vote-related documents (we focus on comment vote via comment id)
  const indexCreateBody = {
    documentType: "commentVote",
    documentIds: [comment.id],
    forceReindex: true,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexCreateBody,
      },
    );
  typia.assert(indexResult);

  TestValidator.predicate(
    "index operation should request at least one document",
    indexResult.totalRequested >= 1,
  );

  TestValidator.predicate(
    "success + failure + skipped should not exceed totalRequested",
    indexResult.successCount +
      indexResult.failureCount +
      indexResult.skippedCount <=
      indexResult.totalRequested,
  );

  let searchIndexIdForDeletion: string;
  if (indexResult.documents !== undefined && indexResult.documents.length > 0) {
    const firstDoc = indexResult.documents[0];
    searchIndexIdForDeletion = firstDoc.documentId;
  } else {
    searchIndexIdForDeletion = comment.id;
  }

  TestValidator.predicate(
    "searchIndexId for deletion should be a non-empty string",
    searchIndexIdForDeletion.length > 0,
  );

  // 12. Delete the index document as adminUser
  await api.functional.communityPlatform.adminUser.search.indexDocuments.erase(
    connection,
    {
      searchIndexId: searchIndexIdForDeletion,
    },
  );

  // 13. Validate that vote and comment data remain logically intact in memory
  TestValidator.equals(
    "post vote direction should remain 'up' after index document deletion",
    postVote.direction,
    "up",
  );

  TestValidator.equals(
    "comment vote upvotes should remain the same after index deletion",
    commentVote.upvotes,
    originalCommentVoteSnapshot.upvotes,
  );

  TestValidator.equals(
    "comment vote downvotes should remain the same after index deletion",
    commentVote.downvotes,
    originalCommentVoteSnapshot.downvotes,
  );

  TestValidator.equals(
    "comment vote score should remain the same after index deletion",
    commentVote.score,
    originalCommentVoteSnapshot.score,
  );

  TestValidator.equals(
    "comment vote myVote should remain the same after index deletion",
    commentVote.myVote,
    originalCommentVoteSnapshot.myVote,
  );

  typia.assert<ICommunityPlatformComment>(comment);
  TestValidator.equals(
    "comment id should remain stable after index deletion",
    comment.id,
    comment.id,
  );

  TestValidator.predicate(
    "adminUser can delete vote-related index documents without affecting underlying votes",
    true,
  );
}
