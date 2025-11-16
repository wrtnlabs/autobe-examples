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

export async function test_api_post_comments_pagination_respects_parent_comment_filter_without_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphabets(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level which we treat as "public"
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code persisted",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Register a member user (join) who will create community, post, and comments
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.test`,
    password: RandomGenerator.alphabets(12),
    ip: RandomGenerator.alphabets(8),
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Create a community using the created visibility level
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 5. Create a post in that community
  // We must provide a post_type_id (UUID). We generate a random UUID using typia.random.
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postTypeId,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );

  // 6. Create a top-level parent comment under that post as the member user
  const parentCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: parentCommentBody,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment belongs to post",
    parentComment.post.id,
    post.id,
  );
  TestValidator.equals(
    "parent comment has null parent",
    parentComment.parentComment,
    null,
  );

  // 7. Create multiple replies whose parentCommentId equals the parent comment's id
  const replyCount = 3;
  const replies: ICommunityPlatformComment[] = [];
  for (let i = 0; i < replyCount; i++) {
    const replyBody = {
      body: RandomGenerator.paragraph({ sentences: 2 }),
      parentCommentId: parentComment.id,
      renderingMode: "markdown",
    } satisfies ICommunityPlatformComment.ICreate;

    const reply: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: replyBody,
        },
      );
    typia.assert(reply);
    replies.push(reply);
  }

  // 8. Build an unauthenticated connection that does not carry Authorization
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. From unauthenticated client, list comments filtered by parentCommentId
  const listRequestBody = {
    parentCommentId: parentComment.id,
    sort: "createdAtAsc",
  } satisfies ICommunityPlatformComment.IRequest;

  const page: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(
      unauthenticatedConnection,
      {
        postId: post.id,
        body: listRequestBody,
      },
    );
  typia.assert(page);

  // 10. Assert pagination metadata and data length match number of replies
  TestValidator.equals(
    "pagination records equals replyCount",
    page.pagination.records,
    replyCount,
  );
  TestValidator.equals(
    "data length equals replyCount",
    page.data.length,
    replyCount,
  );

  // 11. Assert every returned comment is a direct reply to parentComment
  for (const summary of page.data) {
    TestValidator.equals(
      "summary.post_id matches post.id",
      summary.post_id,
      post.id,
    );
    TestValidator.equals(
      "summary.parent_comment_id matches parentComment.id",
      summary.parent_comment_id,
      parentComment.id,
    );
  }

  // 12. Assert the comments are sorted ascending by created_at
  const createdAts = page.data.map((s) => s.created_at);
  for (let i = 1; i < createdAts.length; i++) {
    const prev = createdAts[i - 1];
    const curr = createdAts[i];
    TestValidator.predicate(
      `created_at sorted ascending at index ${i}`,
      prev <= curr,
    );
  }
}
