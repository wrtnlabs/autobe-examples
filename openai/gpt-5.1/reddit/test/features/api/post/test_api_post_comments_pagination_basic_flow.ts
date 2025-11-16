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

export async function test_api_post_comments_pagination_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) to obtain admin context
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminHref: string = "https://admin.example.com/register";
  const platformAdminReferrer: string = "https://admin.example.com";

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: "AdminPassword123!",
    displayName: RandomGenerator.name(),
    href: platformAdminHref as string & tags.Format<"uri">,
    referrer: platformAdminReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin
  const visibilityCodeBase = RandomGenerator.alphaNumeric(8);
  const visibilityCreateBody = {
    code: `public-${visibilityCodeBase}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Create a post type as platformAdmin
  const postTypeCodeBase = RandomGenerator.alphaNumeric(8);
  const postTypeCreateBody = {
    code: `text-${postTypeCodeBase}`,
    name: "Text Post",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 4. Register member user (join) to obtain member context
  const memberUserEmail: string = typia.random<string & tags.Format<"email">>();
  const memberUserHref: string = "https://app.example.com/register";
  const memberUserReferrer: string = "https://app.example.com";

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberUserEmail,
    password: "MemberPassword123!",
    href: memberUserHref as string & tags.Format<"uri">,
    referrer: memberUserReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 5. Create a community as memberUser, referencing the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 6. Create a post in that community as memberUser, referencing the post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 7. Seed 15 comments under the post as memberUser
  const createdComments: ICommunityPlatformComment.ISummary[] = [];

  await ArrayUtil.asyncRepeat(15, async (index) => {
    const commentBodyText = `comment-${index + 1}: ${RandomGenerator.paragraph({
      sentences: 3,
    })}`;

    const commentCreateBody = {
      body: commentBodyText,
      renderingMode: "plainText" as const,
    } satisfies ICommunityPlatformComment.ICreate;

    const createdComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: commentCreateBody,
        },
      );
    typia.assert(createdComment);

    // Normalize into ISummary shape using fields that overlap exactly
    const summary: ICommunityPlatformComment.ISummary = {
      id: createdComment.id,
      post_id: createdComment.post.id,
      parent_comment_id:
        createdComment.parentComment === null
          ? null
          : createdComment.parentComment.id,
      author_memberuser_id: createdComment.author.id,
      body: createdComment.body,
      is_edited: createdComment.is_edited,
      created_at: createdComment.created_at,
      updated_at: createdComment.updated_at,
      deleted_at: createdComment.deleted_at,
    };
    createdComments.push(summary);
  });

  TestValidator.equals(
    "15 comments should have been created",
    createdComments.length,
    15,
  );

  // 8. Fetch first page (page=1, limit=10, sort=createdAtAsc)
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "createdAtAsc" as const,
  } satisfies ICommunityPlatformComment.IRequest;

  const page1: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage1,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // 9. Validate pagination metadata for page 1
  TestValidator.equals(
    "page1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("page1 limit should be 10", pagination1.limit, 10);
  TestValidator.predicate(
    "page1 records should be at least 15",
    pagination1.records >= 15,
  );
  TestValidator.predicate(
    "page1 pages should be at least 2",
    pagination1.pages >= 2,
  );
  TestValidator.equals("page1 data length should be 10", data1.length, 10);

  // All comments in page1 should belong to the same post
  for (const comment of data1) {
    TestValidator.equals(
      "comment.post_id should match created post id",
      comment.post_id,
      post.id,
    );
  }

  // Ensure ordering by created_at ascending on page1
  for (let i = 1; i < data1.length; i++) {
    const prev = data1[i - 1];
    const curr = data1[i];
    TestValidator.predicate(
      `page1 comments should be sorted by created_at ascending at index ${i}`,
      prev.created_at <= curr.created_at,
    );
  }

  // Compare page1 comments with the first 10 created comments
  for (let i = 0; i < data1.length; i++) {
    const expected = createdComments[i];
    const actual = data1[i];
    TestValidator.equals(
      `page1 comment id at index ${i} should match created comment id`,
      actual.id,
      expected.id,
    );
    TestValidator.equals(
      `page1 comment body at index ${i} should match created comment body`,
      actual.body,
      expected.body,
    );
  }

  // 11. Fetch second page (page=2) and validate remaining comments
  const requestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "createdAtAsc" as const,
  } satisfies ICommunityPlatformComment.IRequest;

  const page2: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: requestPage2,
    });
  typia.assert(page2);

  const pagination2 = page2.pagination;
  const data2 = page2.data;

  TestValidator.equals(
    "page2 current page should be 2",
    pagination2.current,
    2,
  );
  // With 15 total and limit 10, second page should contain 5 items
  TestValidator.equals("page2 data length should be 5", data2.length, 5);

  // All comments in page2 should belong to the same post
  for (const comment of data2) {
    TestValidator.equals(
      "page2 comment.post_id should match created post id",
      comment.post_id,
      post.id,
    );
  }

  // Ensure ordering by created_at ascending on page2
  for (let i = 1; i < data2.length; i++) {
    const prev = data2[i - 1];
    const curr = data2[i];
    TestValidator.predicate(
      `page2 comments should be sorted by created_at ascending at index ${i}`,
      prev.created_at <= curr.created_at,
    );
  }

  // Compare page2 comments with the remaining 5 created comments (indices 10..14)
  for (let i = 0; i < data2.length; i++) {
    const expected = createdComments[10 + i];
    const actual = data2[i];
    TestValidator.equals(
      `page2 comment id at index ${i} should match created comment id`,
      actual.id,
      expected.id,
    );
    TestValidator.equals(
      `page2 comment body at index ${i} should match created comment body`,
      actual.body,
      expected.body,
    );
  }
}
