import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validate filtered, sorted, and paginated comment listing for a post.
 *
 * Business flow:
 *
 * 1. Register platform admin and create a visibility level and a text post type.
 * 2. Register two member users (authorA and authorB).
 * 3. As authorA, create a community and a post.
 * 4. As authorA, create a parent top-level comment, then multiple replies to it.
 * 5. As authorB, create extra comments so author-based filters can be checked.
 * 6. Soft-delete one of authorA's replies.
 * 7. Call PATCH /communityPlatform/posts/{postId}/comments with filters:
 *
 *    - AuthorMemberUserId = authorA.id
 *    - ParentCommentId = chosen parent comment id
 *    - IncludeDeleted = true
 *    - Sort = createdAtDesc
 *    - Limit = 5
 * 8. Verify response filtering, deleted inclusion, sorting, and pagination.
 */
export async function test_api_post_comments_pagination_with_filters_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create platform admin and required master data (visibility level, post type)
  const adminJoin = await api.functional.auth.platformAdmin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      displayName: RandomGenerator.name(2),
      ip: undefined,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.IJoin,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminJoin);

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphaNumeric(8)}`,
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `text-${RandomGenerator.alphaNumeric(6)}`,
          name: "Text",
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 2. Register two member users (authorA and authorB)
  const authorAJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: `authorA_${RandomGenerator.alphaNumeric(6)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "AuthorAPassword123!",
      ip: undefined,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorAJoin);

  const authorBJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: `authorB_${RandomGenerator.alphaNumeric(6)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "AuthorBPassword123!",
      ip: undefined,
      href: "https://app.example.com/join",
      referrer: "https://app.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorBJoin);

  // 3. As authorA, create community and post (login switches actor)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: authorAJoin.email,
      password: "AuthorAPassword123!",
      ip: undefined,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: undefined,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: undefined,
        image_uri: undefined,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 4. As authorA, create parent comment and multiple replies under it
  const parentComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(parentComment);

  const replyCount = 7;
  const authorAReplies: ICommunityPlatformComment[] = [];
  for (let i = 0; i < replyCount; i++) {
    const reply =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 2 }),
            parentCommentId: parentComment.id,
            renderingMode: "markdown",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert<ICommunityPlatformComment>(reply);
    authorAReplies.push(reply);
  }

  // 5. As authorB, create extra comments (not to be returned by filtered query)
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: authorBJoin.email,
      password: "AuthorBPassword123!",
      ip: undefined,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  // authorB top-level comment
  const authorBTop =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: undefined,
          renderingMode: "plainText",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(authorBTop);

  // authorB reply to the same parentComment
  const authorBReply =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: parentComment.id,
          renderingMode: "plainText",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(authorBReply);

  // 6. Switch back to authorA and soft-delete one of their replies
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: authorAJoin.email,
      password: "AuthorAPassword123!",
      ip: undefined,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const deletedTarget = authorAReplies[0];
  await api.functional.communityPlatform.memberUser.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: deletedTarget.id,
    },
  );

  // 7. Call PATCH index with filters and pagination (page 1)
  const page1Request = {
    page: 1,
    limit: 5,
    cursor: undefined,
    sort: "createdAtDesc" as const,
    includeDeleted: true,
    parentCommentId: parentComment.id,
    authorMemberUserId: authorAJoin.id,
  } satisfies ICommunityPlatformComment.IRequest;

  const page1 = await api.functional.communityPlatform.posts.comments.index(
    connection,
    {
      postId: post.id,
      body: page1Request,
    },
  );
  typia.assert<IPageICommunityPlatformComment.ISummary>(page1);

  // Basic pagination assertions
  TestValidator.predicate(
    "page1 has non-negative pagination records",
    page1.pagination.records >= 0,
  );
  TestValidator.equals(
    "page1 pagination.current should be 1",
    page1.pagination.current,
    1,
  );

  if (page1.data.length > 0) {
    // Filter checks: all items should match postId, parentCommentId, authorA
    for (const item of page1.data) {
      TestValidator.equals("page1 item belongs to post", item.post_id, post.id);
      TestValidator.equals(
        "page1 item has expected parentCommentId",
        item.parent_comment_id,
        parentComment.id,
      );
      TestValidator.equals(
        "page1 item authored by authorA",
        item.author_memberuser_id,
        authorAJoin.id,
      );
    }

    // Sorting: created_at descending
    for (let i = 1; i < page1.data.length; i++) {
      const prev = page1.data[i - 1];
      const curr = page1.data[i];
      TestValidator.predicate(
        "page1 created_at is sorted desc",
        prev.created_at >= curr.created_at,
      );
    }
  }

  // Ensure at least one deleted comment exists overall for authorA under parent
  const allForCheck =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: replyCount + 5,
        cursor: undefined,
        sort: "createdAtAsc",
        includeDeleted: true,
        parentCommentId: parentComment.id,
        authorMemberUserId: authorAJoin.id,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert<IPageICommunityPlatformComment.ISummary>(allForCheck);
  const hasDeleted = allForCheck.data.some((c) => c.deleted_at !== null);
  TestValidator.predicate(
    "at least one soft-deleted comment is present when includeDeleted=true",
    hasDeleted,
  );

  // 8. Request page 2 with same filters when possible
  if (page1.pagination.pages >= 2) {
    const page2Request = {
      page: 2,
      limit: 5,
      cursor: undefined,
      sort: "createdAtDesc" as const,
      includeDeleted: true,
      parentCommentId: parentComment.id,
      authorMemberUserId: authorAJoin.id,
    } satisfies ICommunityPlatformComment.IRequest;

    const page2 = await api.functional.communityPlatform.posts.comments.index(
      connection,
      {
        postId: post.id,
        body: page2Request,
      },
    );
    typia.assert<IPageICommunityPlatformComment.ISummary>(page2);

    // Confirm pagination metadata consistency
    TestValidator.equals(
      "page2.pagination.records equals page1.pagination.records",
      page2.pagination.records,
      page1.pagination.records,
    );
    TestValidator.equals(
      "page2.pagination.pages equals page1.pagination.pages",
      page2.pagination.pages,
      page1.pagination.pages,
    );
    TestValidator.equals(
      "page2.pagination.current is 2",
      page2.pagination.current,
      2,
    );

    // Ensure disjoint IDs between page1 and page2
    const page1Ids = page1.data.map((c) => c.id);
    const page2Ids = page2.data.map((c) => c.id);
    for (const id of page2Ids) {
      TestValidator.predicate(
        "no duplicated ids between page1 and page2",
        page1Ids.includes(id) === false,
      );
    }
  }
}
