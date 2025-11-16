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

export async function test_api_comments_filter_by_nesting_depth(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category setup
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community (now authenticated as admin)
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Discussion",
          slug: "discussion",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for posts and comments
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "Password123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Nested Comments Test",
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post as root for comment thread
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Nested Comments Test Post",
        content_text: "This post is for testing nested comment filtering",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create comments at various nesting depths
  const commentsByDepth: Map<number, ICommunityPlatformComment[]> = new Map();

  // Depth 0: Create top-level comments
  const depth0Comments: ICommunityPlatformComment[] = [];
  for (let i = 0; i < 2; i++) {
    const topLevelComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: `Top level comment ${i + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(topLevelComment);
    TestValidator.equals(
      `top level comment ${i + 1} depth should be 0`,
      topLevelComment.nesting_depth,
      0,
    );
    depth0Comments.push(topLevelComment);
  }
  commentsByDepth.set(0, depth0Comments);

  // Depth 1-10: Create nested replies
  let currentParent = depth0Comments[0];
  for (let depth = 1; depth <= 10; depth++) {
    const nestedComment: ICommunityPlatformComment =
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            parent_comment_id: currentParent.id,
            content: `Nested reply at depth ${depth}: ${RandomGenerator.paragraph({ sentences: 1 })}`,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    typia.assert(nestedComment);
    TestValidator.equals(
      `nested comment at depth ${depth} should have correct nesting_depth`,
      nestedComment.nesting_depth,
      depth,
    );
    if (!commentsByDepth.has(depth)) {
      commentsByDepth.set(depth, []);
    }
    commentsByDepth.get(depth)!.push(nestedComment);
    currentParent = nestedComment;
  }

  // 7. Test filtering by nesting depth

  // Test depth 0: Should return only top-level comments
  const depth0Result: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        nesting_depth: 0,
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth0Result);
  TestValidator.predicate(
    "depth 0 filter should return at least 2 comments",
    depth0Result.data.length >= 2,
  );
  for (const comment of depth0Result.data) {
    TestValidator.equals(
      "all comments in depth 0 result should have nesting_depth 0",
      comment.nesting_depth,
      0,
    );
  }
  TestValidator.predicate(
    "depth 0 filter should not include comments from other depths",
    depth0Result.data.every((c) => c.nesting_depth === 0),
  );

  // Test depth 1: Should return only first-level replies
  const depth1Result: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        nesting_depth: 1,
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth1Result);
  TestValidator.predicate(
    "depth 1 filter should return at least 1 comment",
    depth1Result.data.length >= 1,
  );
  for (const comment of depth1Result.data) {
    TestValidator.equals(
      "all comments in depth 1 result should have nesting_depth 1",
      comment.nesting_depth,
      1,
    );
  }
  TestValidator.predicate(
    "depth 1 filter should not include comments from other depths",
    depth1Result.data.every((c) => c.nesting_depth === 1),
  );

  // Test depth 5: Should return comments at exactly depth 5
  const depth5Result: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        nesting_depth: 5,
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth5Result);
  for (const comment of depth5Result.data) {
    TestValidator.equals(
      "all comments in depth 5 result should have nesting_depth 5",
      comment.nesting_depth,
      5,
    );
  }
  TestValidator.predicate(
    "depth 5 filter should not include comments from other depths",
    depth5Result.data.every((c) => c.nesting_depth === 5),
  );

  // Test depth 10 (maximum): Should return comments at exactly depth 10
  const depth10Result: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        nesting_depth: 10,
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(depth10Result);
  TestValidator.predicate(
    "depth 10 filter should return at least 1 comment",
    depth10Result.data.length >= 1,
  );
  for (const comment of depth10Result.data) {
    TestValidator.equals(
      "all comments in depth 10 result should have nesting_depth 10",
      comment.nesting_depth,
      10,
    );
  }
  TestValidator.predicate(
    "depth 10 filter should not include comments from other depths",
    depth10Result.data.every((c) => c.nesting_depth === 10),
  );

  // 8. Test pagination with depth filtering
  const paginatedDepth0: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        nesting_depth: 0,
        page: 1,
        page_size: 1,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(paginatedDepth0);
  TestValidator.predicate(
    "paginated depth 0 should respect page_size",
    paginatedDepth0.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination should have valid metadata",
    paginatedDepth0.pagination.current > 0 &&
      paginatedDepth0.pagination.limit > 0,
  );

  // 9. Test that filtering works correctly across the tree
  const noDepthFilter: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        page: 1,
        page_size: 100,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(noDepthFilter);
  TestValidator.predicate(
    "without depth filter should return all comments",
    noDepthFilter.data.length >= 11,
  );

  // 10. Validate depth boundary enforcement
  TestValidator.predicate(
    "all returned comments should have nesting_depth <= 10",
    noDepthFilter.data.every((c) => c.nesting_depth <= 10),
  );
}
