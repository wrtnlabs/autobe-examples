import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformIndexDocuments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformIndexDocuments";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_index_documents_handles_invalid_ids_and_mixed_outcomes(
  connection: api.IConnection,
) {
  // 1. Register member user and obtain authenticated session
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community as memberUser
  const communitySlug = `test-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
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
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Join the community as memberUser
  const membershipCreateBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
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

  // 4. Create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 5. Create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
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

  // 6. Register adminUser and ensure admin context
  const adminJoinBody = {
    username: `admin-${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optional explicit admin login to validate login path (not strictly required
  // for indexing, but follows the dependency list and ensures token switching)
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://community.example.com/admin/login",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLoggedIn: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7a. Index documents for documentType = "post" with one valid and one invalid ID
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();
  const postDocumentIds: string[] = [post.id, invalidPostId];

  const postIndexBody = {
    documentType: "post",
    documentIds: postDocumentIds,
    forceReindex: true,
    priority: undefined,
    batchSize: undefined,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const postIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: postIndexBody },
    );
  typia.assert(postIndexResult);

  // 8a. Validate post indexing aggregate counts
  TestValidator.equals(
    "post indexing totalRequested equals number of requested IDs",
    postIndexResult.totalRequested,
    postDocumentIds.length,
  );
  TestValidator.equals(
    "post indexing successCount is 1",
    postIndexResult.successCount,
    1,
  );
  TestValidator.equals(
    "post indexing failureCount is 1",
    postIndexResult.failureCount,
    1,
  );
  TestValidator.equals(
    "post indexing skippedCount is 0 when forceReindex is true",
    postIndexResult.skippedCount,
    0,
  );

  // Ensure per-document statuses exist
  TestValidator.predicate(
    "post indexing documents array is defined",
    postIndexResult.documents !== undefined,
  );

  const postDocuments = postIndexResult.documents ?? [];
  TestValidator.equals(
    "post indexing documents length matches number of requested IDs",
    postDocuments.length,
    postDocumentIds.length,
  );

  // Find status entries for valid and invalid post IDs
  const postStatusForValid = postDocuments.find(
    (d) => d.documentId === post.id,
  );
  const postStatusForInvalid = postDocuments.find(
    (d) => d.documentId === invalidPostId,
  );

  TestValidator.predicate(
    "post indexing includes status for valid post ID",
    postStatusForValid !== undefined,
  );
  TestValidator.predicate(
    "post indexing includes status for invalid post ID",
    postStatusForInvalid !== undefined,
  );

  if (postStatusForValid !== undefined) {
    TestValidator.equals(
      "valid post status documentType matches 'post'",
      postStatusForValid.documentType,
      "post",
    );
    TestValidator.equals(
      "valid post indexing status is 'success'",
      postStatusForValid.status,
      "success",
    );
  }

  if (postStatusForInvalid !== undefined) {
    TestValidator.equals(
      "invalid post status documentType matches 'post'",
      postStatusForInvalid.documentType,
      "post",
    );
    TestValidator.equals(
      "invalid post indexing status is 'failed'",
      postStatusForInvalid.status,
      "failed",
    );
    TestValidator.predicate(
      "invalid post indexing status has non-empty message",
      !!postStatusForInvalid.message && postStatusForInvalid.message.length > 0,
    );
  }

  // 7b. Index documents for documentType = "comment" with one valid and one invalid ID
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  const commentDocumentIds: string[] = [comment.id, invalidCommentId];

  const commentIndexBody = {
    documentType: "comment",
    documentIds: commentDocumentIds,
    forceReindex: true,
    priority: undefined,
    batchSize: undefined,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const commentIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: commentIndexBody },
    );
  typia.assert(commentIndexResult);

  // 8b. Validate comment indexing aggregate counts
  TestValidator.equals(
    "comment indexing totalRequested equals number of requested IDs",
    commentIndexResult.totalRequested,
    commentDocumentIds.length,
  );
  TestValidator.equals(
    "comment indexing successCount is 1",
    commentIndexResult.successCount,
    1,
  );
  TestValidator.equals(
    "comment indexing failureCount is 1",
    commentIndexResult.failureCount,
    1,
  );
  TestValidator.equals(
    "comment indexing skippedCount is 0 when forceReindex is true",
    commentIndexResult.skippedCount,
    0,
  );

  TestValidator.predicate(
    "comment indexing documents array is defined",
    commentIndexResult.documents !== undefined,
  );

  const commentDocuments = commentIndexResult.documents ?? [];
  TestValidator.equals(
    "comment indexing documents length matches number of requested IDs",
    commentDocuments.length,
    commentDocumentIds.length,
  );

  const commentStatusForValid = commentDocuments.find(
    (d) => d.documentId === comment.id,
  );
  const commentStatusForInvalid = commentDocuments.find(
    (d) => d.documentId === invalidCommentId,
  );

  TestValidator.predicate(
    "comment indexing includes status for valid comment ID",
    commentStatusForValid !== undefined,
  );
  TestValidator.predicate(
    "comment indexing includes status for invalid comment ID",
    commentStatusForInvalid !== undefined,
  );

  if (commentStatusForValid !== undefined) {
    TestValidator.equals(
      "valid comment status documentType matches 'comment'",
      commentStatusForValid.documentType,
      "comment",
    );
    TestValidator.equals(
      "valid comment indexing status is 'success'",
      commentStatusForValid.status,
      "success",
    );
  }

  if (commentStatusForInvalid !== undefined) {
    TestValidator.equals(
      "invalid comment status documentType matches 'comment'",
      commentStatusForInvalid.documentType,
      "comment",
    );
    TestValidator.equals(
      "invalid comment indexing status is 'failed'",
      commentStatusForInvalid.status,
      "failed",
    );
    TestValidator.predicate(
      "invalid comment indexing status has non-empty message",
      !!commentStatusForInvalid.message &&
        commentStatusForInvalid.message.length > 0,
    );
  }
}
