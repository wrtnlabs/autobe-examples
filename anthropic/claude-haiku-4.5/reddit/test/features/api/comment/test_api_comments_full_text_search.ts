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

export async function test_api_comments_full_text_search(
  connection: api.IConnection,
) {
  // 1. Create administrator and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123";
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category
  const category: ICommunityPlatformCategory =
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

  // 3. Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword123";
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion about TypeScript and JavaScript",
        content_text: "Let's discuss the differences",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create multiple comments with distinct keywords
  const comment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "TypeScript provides static typing benefits",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment1);

  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "JavaScript is flexible and dynamic",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment2);

  const comment3: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Python programming language offers great libraries",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment3);

  const comment4: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "Rust provides memory safety guarantees",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment4);

  // 7. Test single word search
  const singleWordSearch: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "TypeScript",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(singleWordSearch);
  TestValidator.predicate(
    "single word search should return comments containing TypeScript",
    singleWordSearch.data.length > 0,
  );

  // 8. Test multi-word phrase search
  const multiWordSearch: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "static typing",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(multiWordSearch);
  TestValidator.predicate(
    "multi-word search should return comments containing the phrase",
    multiWordSearch.data.length > 0,
  );

  // 9. Test partial word matching
  const partialWordSearch: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "Script",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(partialWordSearch);
  TestValidator.predicate(
    "partial word search should return comments matching the pattern",
    partialWordSearch.data.length > 0,
  );

  // 10. Test case-insensitive search
  const lowerCaseSearch: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "javascript",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(lowerCaseSearch);
  TestValidator.predicate(
    "case-insensitive search should find comments regardless of case",
    lowerCaseSearch.data.length > 0,
  );

  // 11. Combine search_query with visibility_status filter
  const searchWithVisibility: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "programming",
        visibility_status: "visible",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchWithVisibility);
  TestValidator.predicate(
    "search with visibility filter should return only visible matching comments",
    searchWithVisibility.data.every((c) => c.visibility_status === "visible"),
  );

  // 12. Combine search_query with vote_score filtering
  const searchWithVoteScore: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "memory",
        min_vote_score: 0,
        max_vote_score: 1000,
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(searchWithVoteScore);
  TestValidator.predicate(
    "search with vote score range should filter by score constraints",
    searchWithVoteScore.data.every(
      (c) => c.vote_score >= 0 && c.vote_score <= 1000,
    ),
  );

  // Verify that search query filters out non-matching comments
  const noMatchSearch: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.comments.index(connection, {
      body: {
        search_query: "nonexistentword12345",
        page: 1,
        page_size: 20,
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(noMatchSearch);
  TestValidator.equals(
    "non-matching search should return no results",
    noMatchSearch.data.length,
    0,
  );
}
