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

export async function test_api_index_documents_for_posts_and_comments_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user (join implicitly authenticates)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community and membership as the member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
  typia.assert<ICommunityPlatformCommunity>(community);

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
  typia.assert<ICommunityPlatformCommunityMembership>(membership);
  TestValidator.equals(
    "community slug used for membership matches created community",
    membership.community.slug,
    community.slug,
  );

  // 3. Create a post in that community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);
  TestValidator.equals(
    "post community id matches community",
    post.community_id,
    community.id,
  );

  // 4. Create multiple comments for that post
  const commentCount = 3;
  const comments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentCreateBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: commentCreateBody,
        },
      );
    typia.assert<ICommunityPlatformComment>(comment);
    comments.push(comment);
  }

  TestValidator.equals(
    "created comments count matches expected",
    comments.length,
    commentCount,
  );

  // 5. Register and authenticate an admin user
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedFromJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // Explicit login to simulate actor switching using identifier (username)
  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedFromLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 6. Index the post as admin
  const indexPostBody = {
    documentType: "post",
    documentIds: [post.id],
    forceReindex: true,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const postIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexPostBody },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(postIndexResult);

  TestValidator.equals(
    "post indexing totalRequested should be 1",
    postIndexResult.totalRequested,
    1,
  );
  TestValidator.equals(
    "post indexing successCount should be 1",
    postIndexResult.successCount,
    1,
  );
  TestValidator.equals(
    "post indexing failureCount should be 0",
    postIndexResult.failureCount,
    0,
  );
  TestValidator.predicate(
    "post indexing skippedCount should be non-negative",
    postIndexResult.skippedCount >= 0,
  );

  TestValidator.predicate(
    "post indexing documents array should be defined and non-empty",
    !!postIndexResult.documents && postIndexResult.documents.length === 1,
  );

  if (postIndexResult.documents && postIndexResult.documents[0]) {
    const status = postIndexResult.documents[0];
    TestValidator.equals(
      "post document status documentType should be 'post'",
      status.documentType,
      "post",
    );
    TestValidator.equals(
      "post document status documentId should match post.id",
      status.documentId,
      post.id,
    );
    TestValidator.equals(
      "post document status should be 'success'",
      status.status,
      "success",
    );
  }

  // 7. Index the comments as admin
  const commentIds = comments.map((c) => c.id);

  const indexCommentsBody = {
    documentType: "comment",
    documentIds: commentIds,
    forceReindex: true,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const commentIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: indexCommentsBody },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(commentIndexResult);

  TestValidator.equals(
    "comment indexing totalRequested equals number of comment ids",
    commentIndexResult.totalRequested,
    commentIds.length,
  );
  TestValidator.equals(
    "comment indexing successCount equals number of comment ids",
    commentIndexResult.successCount,
    commentIds.length,
  );
  TestValidator.equals(
    "comment indexing failureCount should be 0",
    commentIndexResult.failureCount,
    0,
  );
  TestValidator.predicate(
    "comment indexing skippedCount should be non-negative",
    commentIndexResult.skippedCount >= 0,
  );

  TestValidator.predicate(
    "comment indexing documents array length matches comment ids length",
    !!commentIndexResult.documents &&
      commentIndexResult.documents.length === commentIds.length,
  );

  if (commentIndexResult.documents) {
    for (const comment of comments) {
      const status = commentIndexResult.documents.find(
        (doc) => doc.documentId === comment.id,
      );

      TestValidator.predicate(
        "each comment id should have a corresponding document status entry",
        !!status,
      );

      if (status) {
        TestValidator.equals(
          "comment document status documentType should be 'comment'",
          status.documentType,
          "comment",
        );
        TestValidator.equals(
          "comment document status documentId should match comment.id",
          status.documentId,
          comment.id,
        );
        TestValidator.equals(
          "comment document status should be 'success'",
          status.status,
          "success",
        );
      }
    }
  }

  // 8. Optional: bulk indexing for posts without explicit documentIds
  const bulkPostIndexBody = {
    documentType: "post",
    forceReindex: true,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const bulkPostIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      { body: bulkPostIndexBody },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(bulkPostIndexResult);

  TestValidator.predicate(
    "bulk post indexing totalRequested should be non-negative",
    bulkPostIndexResult.totalRequested >= 0,
  );
  TestValidator.predicate(
    "bulk post indexing successCount should be non-negative",
    bulkPostIndexResult.successCount >= 0,
  );
  TestValidator.predicate(
    "bulk post indexing failureCount should be non-negative",
    bulkPostIndexResult.failureCount >= 0,
  );
  TestValidator.predicate(
    "bulk post indexing skippedCount should be non-negative",
    bulkPostIndexResult.skippedCount >= 0,
  );

  if (bulkPostIndexResult.documents) {
    for (const doc of bulkPostIndexResult.documents) {
      TestValidator.equals(
        "bulk post document status documentType should be 'post'",
        doc.documentType,
        "post",
      );
    }
  }
}
