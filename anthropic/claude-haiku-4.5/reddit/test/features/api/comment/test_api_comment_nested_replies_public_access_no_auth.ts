import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

export async function test_api_comment_nested_replies_public_access_no_auth(
  connection: api.IConnection,
) {
  // 1. Create member account for posting comments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.predicate("member created", member.id !== null);

  // 2. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        username: RandomGenerator.name(1),
        password: "AdminPassword123!",
        name: RandomGenerator.name(2),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 3. Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post in the community
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create parent comment
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // 7. Create child comments (nested replies)
  const childComments = await ArrayUtil.asyncRepeat(3, async () => {
    const comment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: parentComment.id,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    return comment;
  });

  // 8. Create unauthenticated connection (public access - no auth header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. Retrieve nested replies without authentication
  const nestedRepliesResponse =
    await api.functional.communityPlatform.comments.comments.index(
      publicConnection,
      {
        commentId: parentComment.id,
        body: {
          page: 1,
          page_size: 10,
          sort_by: "new",
          visibility_status: "visible",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(nestedRepliesResponse);

  // 10. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    nestedRepliesResponse.pagination !== null,
  );
  TestValidator.equals(
    "current page is 1",
    nestedRepliesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(nestedRepliesResponse.data),
  );

  // 11. Validate comment data
  TestValidator.predicate(
    "returned comments match created count",
    nestedRepliesResponse.data.length >= 3,
  );

  // 12. Validate all returned comments have visibility_status='visible'
  nestedRepliesResponse.data.forEach((comment, index) => {
    typia.assert(comment);
    TestValidator.equals(
      `comment ${index} has visible status`,
      comment.visibility_status,
      "visible",
    );
    TestValidator.predicate(
      `comment ${index} has content`,
      comment.content.length > 0,
    );
    TestValidator.predicate(
      `comment ${index} has creator info`,
      comment.creator.id !== null,
    );
    TestValidator.predicate(
      `comment ${index} has post info`,
      comment.post.id === post.id,
    );
  });

  // 13. Validate comment order by creation time (newest first with 'new' sort)
  if (nestedRepliesResponse.data.length > 1) {
    for (let i = 0; i < nestedRepliesResponse.data.length - 1; i++) {
      const current = new Date(nestedRepliesResponse.data[i].created_at);
      const next = new Date(nestedRepliesResponse.data[i + 1].created_at);
      TestValidator.predicate(
        `comment ${i} is newer or equal to comment ${i + 1}`,
        current.getTime() >= next.getTime(),
      );
    }
  }

  // 14. Validate pagination metadata
  TestValidator.predicate(
    "total records >= created comments",
    nestedRepliesResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "limit is set",
    nestedRepliesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pages is calculated correctly",
    nestedRepliesResponse.pagination.pages > 0,
  );
}
