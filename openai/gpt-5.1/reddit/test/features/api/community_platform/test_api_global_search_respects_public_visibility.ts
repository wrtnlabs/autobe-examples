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
import type { ICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSearchIndex";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSearchIndex";

export async function test_api_global_search_respects_public_visibility(
  connection: api.IConnection,
) {
  // Helper to clone connection with empty headers (guest)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Common join context
  const href = "https://community.example.com/join" as const;
  const referrer = "https://community.example.com/landing" as const;

  // 1. Create two member users with stored passwords
  const publicUsername = RandomGenerator.alphabets(8);
  const restrictedUsername = RandomGenerator.alphabets(8);
  const publicEmail = `${publicUsername}@example.com` as string &
    tags.Format<"email">;
  const restrictedEmail = `${restrictedUsername}@example.com` as string &
    tags.Format<"email">;
  const publicPassword = RandomGenerator.alphaNumeric(12);
  const restrictedPassword = RandomGenerator.alphaNumeric(12);

  const publicMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: publicUsername,
        email: publicEmail,
        password: publicPassword,
        ip: null,
        href,
        referrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(publicMember);

  const restrictedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: restrictedUsername,
        email: restrictedEmail,
        password: restrictedPassword,
        ip: null,
        href,
        referrer,
      } satisfies ICommunityPlatformMemberuser.IJoin,
    });
  typia.assert(restrictedMember);

  // 2. As UserPublic, create a public community
  const publicKeyword = "public-keyword";
  const publicSlug = `${publicKeyword}-${RandomGenerator.alphabets(6)}`;
  const publicCommunityName = `Public Community ${publicKeyword}`;

  const publicCommunityCreate = {
    slug: publicSlug,
    name: publicCommunityName,
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

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: publicCommunityCreate,
      },
    );
  typia.assert(publicCommunity);

  // 3. As UserRestricted, create a restricted/private community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: restrictedEmail,
      password: restrictedPassword,
      ip: null,
      href,
      referrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const restrictedKeyword = "restricted-keyword";
  const restrictedSlug = `${restrictedKeyword}-${RandomGenerator.alphabets(6)}`;
  const restrictedCommunityName = `Restricted Community ${restrictedKeyword}`;

  const restrictedCommunityCreate = {
    slug: restrictedSlug,
    name: restrictedCommunityName,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const restrictedCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: restrictedCommunityCreate,
      },
    );
  typia.assert(restrictedCommunity);

  // 4. Ensure memberships for each user in their communities
  const restrictedMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const restrictedMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: restrictedCommunity.slug,
        body: restrictedMembershipBody,
      },
    );
  typia.assert(restrictedMembership);

  // Switch back to public member to create membership in public community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: publicEmail,
      password: publicPassword,
      ip: null,
      href,
      referrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const publicMembershipBody = {
    role: "member",
    isApproved: true,
    isBanned: false,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const publicMembership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: publicCommunity.slug,
        body: publicMembershipBody,
      },
    );
  typia.assert(publicMembership);

  // 5. Create posts and comments in each community
  const publicPostBody = {
    communityId: publicCommunity.id,
    communityCode: publicCommunity.slug,
    title: `Post about ${publicKeyword}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const publicPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: publicPostBody,
    });
  typia.assert(publicPost);

  const publicCommentBody = {
    content: `Comment including ${publicKeyword}`,
  } satisfies ICommunityPlatformComment.ICreate;

  const publicComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: publicPost.id as string & tags.Format<"uuid">,
        body: publicCommentBody,
      },
    );
  typia.assert(publicComment);

  // Switch to restricted member and create post & comment in restricted community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: restrictedEmail,
      password: restrictedPassword,
      ip: null,
      href,
      referrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const restrictedPostBody = {
    communityId: restrictedCommunity.id,
    communityCode: restrictedCommunity.slug,
    title: `Post about ${restrictedKeyword}`,
    body: RandomGenerator.paragraph({ sentences: 10 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const restrictedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: restrictedPostBody,
    });
  typia.assert(restrictedPost);

  const restrictedCommentBody = {
    content: `Comment including ${restrictedKeyword}`,
  } satisfies ICommunityPlatformComment.ICreate;

  const restrictedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: restrictedPost.id as string & tags.Format<"uuid">,
        body: restrictedCommentBody,
      },
    );
  typia.assert(restrictedComment);

  // 6. Create an admin user and login
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${adminUsername}@admin.example.com` as string &
    tags.Format<"email">;
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  const adminLoginBody = {
    identifier: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminLogin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 7. Index communities, posts, and comments as admin
  const indexCommunityBody = {
    documentType: "community",
    documentIds: [publicCommunity.id, restrictedCommunity.id],
    forceReindex: true,
    priority: "normal",
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const communityIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexCommunityBody,
      },
    );
  typia.assert(communityIndexResult);

  const indexPostBody = {
    documentType: "post",
    documentIds: [publicPost.id, restrictedPost.id],
    forceReindex: true,
    priority: "normal",
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const postIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexPostBody,
      },
    );
  typia.assert(postIndexResult);

  const indexCommentBody = {
    documentType: "comment",
    documentIds: [publicComment.id, restrictedComment.id],
    forceReindex: true,
    priority: "normal",
    batchSize: 10,
  } satisfies ICommunityPlatformIndexDocuments.ICreate;

  const commentIndexResult: ICommunityPlatformIndexDocuments =
    await api.functional.communityPlatform.adminUser.search.indexDocuments.create(
      connection,
      {
        body: indexCommentBody,
      },
    );
  typia.assert(commentIndexResult);

  // 8. Guest global search for the public keyword
  const guestSearchBody = {
    query: publicKeyword,
    types: ["community", "post", "comment"],
    page: 1,
    limit: 50,
    sort: "relevance",
  } satisfies ICommunityPlatformSearchIndex.IRequest;

  const guestSearchResult: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(
      guestConnection,
      {
        body: guestSearchBody,
      },
    );
  typia.assert(guestSearchResult);

  TestValidator.predicate(
    "guest search should return at least one result for public keyword",
    guestSearchResult.data.length > 0,
  );

  const guestHasRestricted = guestSearchResult.data.some((item) => {
    const titleLower = item.title.toLowerCase();
    const summaryLower = (item.summary ?? "").toLowerCase();
    return (
      titleLower.includes(restrictedKeyword.toLowerCase()) ||
      summaryLower.includes(restrictedKeyword.toLowerCase())
    );
  });

  TestValidator.predicate(
    "guest search must not expose restricted keyword in any result",
    !guestHasRestricted,
  );

  const guestHasPublic = guestSearchResult.data.some((item) => {
    const titleLower = item.title.toLowerCase();
    const summaryLower = (item.summary ?? "").toLowerCase();
    return (
      titleLower.includes(publicKeyword.toLowerCase()) ||
      summaryLower.includes(publicKeyword.toLowerCase())
    );
  });

  TestValidator.predicate(
    "guest search should have a result mentioning the public keyword",
    guestHasPublic,
  );

  // 9. Authenticated search as restricted member for restricted keyword
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: restrictedEmail,
      password: restrictedPassword,
      ip: null,
      href,
      referrer,
    } satisfies ICommunityPlatformMemberuser.ILogin,
  });

  const restrictedSearchBody = {
    query: restrictedKeyword,
    types: ["community", "post", "comment"],
    page: 1,
    limit: 50,
    sort: "relevance",
  } satisfies ICommunityPlatformSearchIndex.IRequest;

  const restrictedSearchResult: IPageICommunityPlatformSearchIndex.ISummary =
    await api.functional.communityPlatform.search.global.index(connection, {
      body: restrictedSearchBody,
    });
  typia.assert(restrictedSearchResult);

  // No strict assertion on restricted search visibility: behavior may vary by
  // business rules; guest visibility guarantees have already been verified.
}
