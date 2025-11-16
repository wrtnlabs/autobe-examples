import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

export async function test_api_comment_edit_history_list_for_comment_author(
  connection: api.IConnection,
) {
  // 1. Register member user (Member A) and obtain authorized connection
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Create a community
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}` as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
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
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a membership for Member A in this community
  const membershipBody = {
    role: "member",
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.memberUser.communities.memberships.create(
      connection,
      {
        communitySlug: community.slug,
        body: membershipBody,
      },
    );
  typia.assert(membership);

  // 4. Create a post in the community
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 5. Create a comment under the post
  const commentBody = {
    content: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 6. Build request for listing edit histories (page 1)
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort: "created_at_desc" as "created_at_desc",
    hasEditReason: null,
  } satisfies ICommunityPlatformCommentEditHistory.IRequest;

  // 7. Call edit history listing endpoint
  const page1: IPageICommunityPlatformCommentEditHistory =
    await api.functional.communityPlatform.memberUser.comments.editHistories.index(
      connection,
      {
        commentId: comment.id,
        body: requestPage1,
      },
    );
  typia.assert(page1);

  // 8. Validate pagination metadata for page 1
  TestValidator.equals<IPage.IPagination>(
    "pagination for page 1 has current=1",
    page1.pagination,
    {
      ...page1.pagination,
      current: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  );

  TestValidator.equals<IPage.IPagination>(
    "pagination for page 1 has limit=10",
    page1.pagination,
    {
      ...page1.pagination,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
  );

  TestValidator.predicate(
    "page1 data length is <= pageSize",
    page1.data.length <= requestPage1.pageSize,
  );

  // 9. If there are any history entries, validate scoping and ordering
  if (page1.data.length > 0) {
    const firstHistory: ICommunityPlatformCommentEditHistory = page1.data[0];
    typia.assert(firstHistory);

    TestValidator.equals<string & tags.Format<"uuid">>(
      "first history entry belongs to the target comment",
      firstHistory.comment.id,
      comment.id,
    );

    // Validate created_at descending order
    for (let i = 1; i < page1.data.length; i++) {
      const prev = page1.data[i - 1];
      const curr = page1.data[i];
      TestValidator.predicate(
        `history list is sorted by created_at descending at index ${i}`,
        prev.created_at >= curr.created_at,
      );
    }
  }

  // 10. Optionally, if more than one page exists, query page 2
  if (page1.pagination.pages > 1) {
    const requestPage2 = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      pageSize: requestPage1.pageSize,
      sort: requestPage1.sort,
      hasEditReason: requestPage1.hasEditReason,
    } satisfies ICommunityPlatformCommentEditHistory.IRequest;

    const page2: IPageICommunityPlatformCommentEditHistory =
      await api.functional.communityPlatform.memberUser.comments.editHistories.index(
        connection,
        {
          commentId: comment.id,
          body: requestPage2,
        },
      );
    typia.assert(page2);

    TestValidator.equals<IPage.IPagination>(
      "pagination for page 2 has current=2",
      page2.pagination,
      {
        ...page2.pagination,
        current: 2 as number & tags.Type<"int32"> & tags.Minimum<0>,
      },
    );

    TestValidator.predicate(
      "page2 data length is <= pageSize",
      page2.data.length <= requestPage2.pageSize,
    );

    if (page2.data.length > 0) {
      const firstHistoryPage2: ICommunityPlatformCommentEditHistory =
        page2.data[0];
      typia.assert(firstHistoryPage2);

      TestValidator.equals<string & tags.Format<"uuid">>(
        "first page2 history entry belongs to the target comment",
        firstHistoryPage2.comment.id,
        comment.id,
      );

      for (let i = 1; i < page2.data.length; i++) {
        const prev = page2.data[i - 1];
        const curr = page2.data[i];
        TestValidator.predicate(
          `page2 history list is sorted by created_at descending at index ${i}`,
          prev.created_at >= curr.created_at,
        );
      }
    }
  }
}
