import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_member_post_comments_list_requires_member_auth(
  connection: api.IConnection,
) {
  // 1. Register a memberUser via join to obtain a valid memberUser token
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. Create a community as the authenticated memberUser
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

  // 3. Create a post within that community as the same memberUser
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert<ICommunityPlatformPost>(post);

  // 4. Seed a small number of comments on the post as the memberUser
  const commentCount = 3;
  const createdComments: ICommunityPlatformComment[] = [];

  for (let i = 0; i < commentCount; i++) {
    const commentCreateBody = {
      content: RandomGenerator.paragraph({ sentences: 2 }),
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
    createdComments.push(comment);
  }

  // Helper to build a simple index request body
  const buildIndexRequestBody = (): ICommunityPlatformComment.IRequest => {
    return {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      cursor: undefined,
      orderBy: "createdAtAsc",
      authorMemberUserId: undefined,
      communityId: undefined,
      postId: post.id,
      parentCommentId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      query: undefined,
      includeRemoved: undefined,
      includeHiddenByScore: undefined,
    } satisfies ICommunityPlatformComment.IRequest;
  };

  // 5. Attempt to index comments without any Authorization header
  const anonymousConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "anonymous caller cannot list member post comments",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.index(
        anonymousConnection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: buildIndexRequestBody(),
        },
      );
    },
  );

  // 6. Create an adminUser via join, which will set an admin JWT token on the connection
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 7. With adminUser token on the shared connection, attempt to index comments again.
  await TestValidator.error(
    "adminUser token cannot access memberUser comments index",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.index(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: buildIndexRequestBody(),
        },
      );
    },
  );

  // 8. Restore a memberUser-authenticated context by joining another memberUser
  const secondMemberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const secondMemberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: secondMemberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(
    secondMemberAuthorized,
  );

  // 9. Call index correctly as a memberUser and verify that we get the comments back
  const indexResponse: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: buildIndexRequestBody(),
      },
    );
  typia.assert<IPageICommunityPlatformComment.ISummary>(indexResponse);

  // Basic pagination sanity checks
  TestValidator.predicate(
    "indexResponse.pagination.limit is positive",
    indexResponse.pagination.limit > 0,
  );

  // Ensure at least the seeded comments are included in the returned data.
  const returnedIds = indexResponse.data.map((summary) => summary.id);
  for (const comment of createdComments) {
    TestValidator.predicate(
      "created comment must appear in index result",
      returnedIds.includes(comment.id),
    );
  }
}
