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

export async function test_api_comments_list_with_default_pagination(
  connection: api.IConnection,
) {
  // Setup: Create administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member and create account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Create multiple comments (more than default page size would show)
  const commentCount = 25;
  const createdComments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 10,
            }),
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Test default pagination - retrieve comments without specifying page or page_size
  const result: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {} satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(result);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination object exists",
    result.pagination !== undefined && result.pagination !== null,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(result.data) && result.data.length > 0,
  );

  // Validate pagination metadata
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate("page limit is 20", result.pagination.limit === 20);
  TestValidator.predicate(
    "total records matches created comments",
    result.pagination.records === commentCount,
  );

  // Validate pages calculation (ceiling of records / limit)
  const expectedPages = Math.ceil(commentCount / 20);
  TestValidator.equals(
    "total pages calculated correctly",
    result.pagination.pages,
    expectedPages,
  );

  // Validate returned data count (should be 20 on first page)
  TestValidator.predicate(
    "returned data count matches page size",
    result.data.length === 20,
  );

  // Validate all returned comments have proper structure
  for (const comment of result.data) {
    typia.assert<ICommunityPlatformComment>(comment);
    TestValidator.predicate(
      "comment has id",
      comment.id !== undefined && comment.id.length > 0,
    );
    TestValidator.predicate(
      "comment has content",
      comment.content !== undefined && comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has creator",
      comment.creator !== undefined && comment.creator.id !== undefined,
    );
    TestValidator.predicate(
      "comment has post reference",
      comment.post !== undefined && comment.post.id === post.id,
    );
  }
}
