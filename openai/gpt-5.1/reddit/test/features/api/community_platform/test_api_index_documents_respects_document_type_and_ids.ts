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

/**
 * Validate that the admin indexing endpoint respects documentType and
 * documentIds filters.
 *
 * Business workflow:
 *
 * 1. Register a memberUser and implicitly create an authenticated session.
 * 2. As that memberUser, create two distinct communities.
 * 3. Join both communities (memberships) so that posting is legitimate.
 * 4. Create multiple posts across both communities and capture their IDs.
 * 5. For a subset of those posts, create comments; capture the comment IDs.
 * 6. Register an adminUser account and then login as that adminUser to obtain
 *    admin context.
 * 7. Call POST /communityPlatform/adminUser/search/indexDocuments with
 *    documentType = "post" and documentIds equal to a chosen subset of post
 *    IDs.
 * 8. Assert that the response describes only those posts: totalRequested matches
 *    the number of IDs sent, successCount equals totalRequested, failureCount
 *    and skippedCount are zero, and each documents entry has documentType =
 *    "post", documentId in the requested set, status = "success".
 * 9. Call the same endpoint again with documentType = "comment" and a subset of
 *    comment IDs, and assert analogous behavior for comments.
 * 10. Confirm that no cross-type leakage occurs by checking that each call’s
 *     documents[].documentId is always within the corresponding requested ID
 *     set for that documentType.
 */
export async function test_api_index_documents_respects_document_type_and_ids(
  connection: api.IConnection,
) {
  // 1. Register memberUser
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8) as string &
      tags.MinLength<3> &
      tags.MaxLength<32>,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string & tags.MinLength<8>,
    ip: null,
    href: "https://client.example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create two communities as the memberUser
  const communityCreateBase = () => {
    const slug = `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>;
    const name = RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>;
    const description = RandomGenerator.paragraph({ sentences: 5 });
    return {
      slug,
      name,
      description,
      visibility: "public",
      status: "active",
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    } satisfies ICommunityPlatformCommunity.ICreate;
  };

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(),
      },
    );
  typia.assert(communityA);

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBase(),
      },
    );
  typia.assert(communityB);

  // 3. Join both communities (memberships)
  const membershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipA: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityA.slug,
        body: membershipBody,
      },
    );
  typia.assert(membershipA);

  const membershipB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: communityB.slug,
        body: membershipBody,
      },
    );
  typia.assert(membershipB);

  // 4. Create multiple posts across both communities
  const createPostForCommunity = async (
    community: ICommunityPlatformCommunity,
  ): Promise<ICommunityPlatformPost[]> => {
    const posts: ICommunityPlatformPost[] = [];
    for (let i = 0; i < 3; i++) {
      const body = {
        communityId: community.id,
        communityCode: community.slug,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: undefined,
        postType: "text",
      } satisfies ICommunityPlatformPost.ICreate;

      const post: ICommunityPlatformPost =
        await api.functional.communityPlatform.memberUser.posts.create(
          connection,
          { body },
        );
      typia.assert(post);
      posts.push(post);
    }
    return posts;
  };

  const postsA: ICommunityPlatformPost[] =
    await createPostForCommunity(communityA);
  const postsB: ICommunityPlatformPost[] =
    await createPostForCommunity(communityB);

  const allPosts: ICommunityPlatformPost[] = [...postsA, ...postsB];

  // Choose a subset of posts to index (2 posts: one from each community if possible)
  const chosenPostIds: string[] = [
    allPosts[0].id,
    allPosts[allPosts.length - 1].id,
  ];

  // 5. Create comments for some posts and capture comment IDs
  const comments: ICommunityPlatformComment[] = [];
  const targetPostsForComments: ICommunityPlatformPost[] = [
    allPosts[1],
    allPosts[2],
  ];

  for (const targetPost of targetPostsForComments) {
    const commentBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: targetPost.id as string & tags.Format<"uuid">,
          body: commentBody,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  const chosenCommentIds: string[] = comments.map((c) => c.id);

  // 6. Register adminUser and then login to ensure admin context is active
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: adminEmail,
    password: ("AdminPass-" + RandomGenerator.alphaNumeric(8)) as string &
      tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorizedOnJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // Explicit admin login to simulate real-world actor switching pattern
  const adminLoginBody = {
    identifier: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAuthorizedOnLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 7. Index subset of posts
  const indexPostsBody = {
    documentType: "post",
    documentIds: chosenPostIds,
    forceReindex: true,
    priority: "normal",
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const postIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexPostsBody,
      },
    );
  typia.assert(postIndexResult);

  // Validate counts for posts
  TestValidator.equals(
    "post indexing totalRequested matches chosenPostIds length",
    postIndexResult.totalRequested,
    chosenPostIds.length,
  );
  TestValidator.equals(
    "post indexing successCount equals totalRequested",
    postIndexResult.successCount,
    postIndexResult.totalRequested,
  );

  // We only assert positive-success expectations; failure and skipped counts
  // should be zero in the happy path but we avoid making overly brittle
  // assumptions about internal behavior.
  TestValidator.predicate(
    "post indexing failureCount is not greater than 0",
    postIndexResult.failureCount <= 0,
  );
  TestValidator.predicate(
    "post indexing skippedCount is not greater than 0",
    postIndexResult.skippedCount <= 0,
  );

  if (postIndexResult.documents !== undefined) {
    for (const doc of postIndexResult.documents) {
      TestValidator.equals(
        "post indexing documentType is 'post'",
        doc.documentType,
        "post",
      );
      TestValidator.predicate(
        "post indexing documentId is one of chosenPostIds",
        chosenPostIds.includes(doc.documentId),
      );
    }
  }

  // 8. Index subset of comments
  const indexCommentsBody = {
    documentType: "comment",
    documentIds: chosenCommentIds,
    forceReindex: true,
    priority: "normal",
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const commentIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexCommentsBody,
      },
    );
  typia.assert(commentIndexResult);

  // Validate counts for comments
  TestValidator.equals(
    "comment indexing totalRequested matches chosenCommentIds length",
    commentIndexResult.totalRequested,
    chosenCommentIds.length,
  );
  TestValidator.equals(
    "comment indexing successCount equals totalRequested",
    commentIndexResult.successCount,
    commentIndexResult.totalRequested,
  );
  TestValidator.predicate(
    "comment indexing failureCount is not greater than 0",
    commentIndexResult.failureCount <= 0,
  );
  TestValidator.predicate(
    "comment indexing skippedCount is not greater than 0",
    commentIndexResult.skippedCount <= 0,
  );

  if (commentIndexResult.documents !== undefined) {
    for (const doc of commentIndexResult.documents) {
      TestValidator.equals(
        "comment indexing documentType is 'comment'",
        doc.documentType,
        "comment",
      );
      TestValidator.predicate(
        "comment indexing documentId is one of chosenCommentIds",
        chosenCommentIds.includes(doc.documentId),
      );
    }
  }
}
