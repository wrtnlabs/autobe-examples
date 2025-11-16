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

export async function test_api_comment_retrieval_sorting_top(
  connection: api.IConnection,
) {
  // Step 1: Administrator registration and category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology and programming discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member registration
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Community creation by member
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "TypeScript Discussion",
          identifier: `ts_${RandomGenerator.alphaNumeric(6)}`,
          description: "Discussion about TypeScript best practices",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Post creation in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Best practices for TypeScript development",
        content_text: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Retrieve comments with 'top' sorting (highest vote scores first)
  const retrievedComments: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 20,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(retrievedComments);

  // Step 6: Validate that comments are sorted by vote_score in descending order (top sorting)
  TestValidator.predicate(
    "comments should be sorted by vote_score in descending order (top sorting)",
    () => {
      const scores = retrievedComments.data.map((c) => c.vote_score);
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[i - 1]) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 7: Validate pagination information is valid
  TestValidator.predicate("pagination should have valid page info", () => {
    const { pagination } = retrievedComments;
    return (
      pagination.current >= 1 &&
      pagination.limit > 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0
    );
  });

  // Step 8: Validate current page matches expected page number
  TestValidator.equals(
    "current page should be 1 for first request",
    retrievedComments.pagination.current,
    1,
  );

  // Step 9: Test pagination with different page sizes to verify sorting is consistent
  const smallPageComments: IPageICommunityPlatformComment =
    await api.functional.communityPlatform.posts.comments.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        page_size: 5,
        sort_by: "top",
      } satisfies ICommunityPlatformComment.IRequest,
    });
  typia.assert(smallPageComments);

  // Verify smaller page size also maintains top sorting
  TestValidator.predicate(
    "small page size should also maintain top sorting",
    () => {
      const scores = smallPageComments.data.map((c) => c.vote_score);
      for (let i = 1; i < scores.length; i++) {
        if (scores[i] > scores[i - 1]) {
          return false;
        }
      }
      return true;
    },
  );

  // Step 10: If pagination shows multiple pages exist, validate second page also maintains sorting
  if (retrievedComments.pagination.pages > 1) {
    const secondPage: IPageICommunityPlatformComment =
      await api.functional.communityPlatform.posts.comments.index(connection, {
        postId: post.id,
        body: {
          page: 2,
          page_size: 20,
          sort_by: "top",
        } satisfies ICommunityPlatformComment.IRequest,
      });
    typia.assert(secondPage);

    // Verify second page also maintains top sorting
    TestValidator.predicate(
      "second page comments should also be in descending vote_score order",
      () => {
        const scores = secondPage.data.map((c) => c.vote_score);
        for (let i = 1; i < scores.length; i++) {
          if (scores[i] > scores[i - 1]) {
            return false;
          }
        }
        return true;
      },
    );

    // Validate cross-page sorting consistency
    if (retrievedComments.data.length > 0 && secondPage.data.length > 0) {
      const firstPageMin = Math.min(
        ...retrievedComments.data.map((c) => c.vote_score),
      );
      const secondPageMax = Math.max(
        ...secondPage.data.map((c) => c.vote_score),
      );

      TestValidator.predicate(
        "first page minimum score should be >= second page maximum score (top sorting consistency)",
        firstPageMin >= secondPageMax,
      );
    }
  }
}
