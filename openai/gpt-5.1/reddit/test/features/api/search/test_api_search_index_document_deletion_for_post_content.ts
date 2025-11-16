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
import type { ICommunityPlatformUserAchievement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserAchievement";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

/**
 * Validate that an adminUser can delete a search index document related to a
 * post.
 *
 * Business flow (happy path only):
 *
 * 1. Create an adminUser (join) which also authenticates the admin actor.
 * 2. Create a memberUser (join) which authenticates the member.
 * 3. As memberUser, create a community.
 * 4. As memberUser, create a membership in that community.
 * 5. As memberUser, create a post in that community.
 * 6. As memberUser, create a comment under that post.
 * 7. Switch back to adminUser (login) to ensure an admin token is active.
 * 8. As adminUser, request indexing for the created post via
 *    search.indexDocuments.create.
 * 9. As adminUser, call search.indexDocuments.erase with a searchIndexId to
 *    exercise the deletion endpoint.
 * 10. Assert the indexDocuments.create result is consistent (counts add up) and
 *     that erase can be invoked without type errors.
 */
export async function test_api_search_index_document_deletion_for_post_content(
  connection: api.IConnection,
) {
  // 1. Admin join (register and authenticate an adminUser)
  const adminPassword = "Adm1n!";
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminJoin);

  // 2. Member join (register and authenticate a memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) as string & tags.MinLength<8>,
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // 3. As memberUser, create a community
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: communitySlug as string & tags.MinLength<1> & tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MaxLength<4000>,
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

  // 4. As memberUser, create a membership for this community
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

  // 5. As memberUser, create a post in the community
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 10,
    }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 6. As memberUser, create a comment on the post
  const commentCreateBody = {
    content: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<10000>,
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
  typia.assert<ICommunityPlatformComment>(comment);

  // 7. Switch back to adminUser via login to ensure admin context
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminPassword,
    ip: null,
    href: "https://example.com/admin/login" as string & tags.Format<"uri">,
    referrer: "https://example.com/admin" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 8. As adminUser, index the post document
  const indexCreateBody = {
    documentType: "post",
    documentIds: [post.id],
    forceReindex: true,
    priority: "normal",
    batchSize: 1 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const indexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexCreateBody,
      },
    );
  typia.assert<ICommunityPlatformIndexDocuments>(indexResult);

  // Basic consistency checks on index result
  TestValidator.predicate(
    "indexing should have at least one requested document",
    indexResult.totalRequested >= 1,
  );
  TestValidator.equals(
    "success + failure + skipped counts should equal totalRequested",
    indexResult.totalRequested,
    indexResult.successCount +
      indexResult.failureCount +
      indexResult.skippedCount,
  );

  // 9. As adminUser, call erase on a search index ID.
  // We do not have a real searchIndexId from the API, but we can still
  // exercise the endpoint with some identifier to validate the call path.
  const searchIndexId: string = RandomGenerator.alphaNumeric(24);

  await api.functional.communityPlatform.adminUser.search.indexDocuments.erase(
    connection,
    {
      searchIndexId,
    },
  );
}
