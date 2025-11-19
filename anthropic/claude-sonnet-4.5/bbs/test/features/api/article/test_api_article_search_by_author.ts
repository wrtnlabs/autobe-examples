import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";

/**
 * Test filtering articles by specific author using discussion_board_member_id
 * parameter.
 *
 * This test validates the author-based filtering functionality of the article
 * search API. It creates multiple members who each author several articles,
 * then searches for articles by a specific member to verify that only articles
 * authored by that member are returned.
 *
 * Test steps:
 *
 * 1. Create moderator account and article category
 * 2. Create multiple member accounts (3 members)
 * 3. Each member creates multiple articles (4-5 articles each)
 * 4. Select one member as the target author
 * 5. Search articles filtered by target member's ID
 * 6. Verify all returned articles are authored by the target member only
 * 7. Verify author summary information is correctly populated
 * 8. Test pagination for member-specific article collections
 */
export async function test_api_article_search_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article categories
  const categories = await ArrayUtil.asyncRepeat(3, async (index) => {
    const categoryNames = [
      "Economic Discussion",
      "Political Discussion",
      "General Discussion",
    ] as const;
    const categorySlugs = [
      "economic-discussion",
      "political-discussion",
      "general-discussion",
    ] as const;

    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: {
            name: categoryNames[index],
            slug: categorySlugs[index],
            description: `Category for ${categoryNames[index].toLowerCase()}`,
            sort_order: (index + 1) satisfies number as number,
          } satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  // Step 3: Create multiple member accounts
  const members = await ArrayUtil.asyncRepeat(3, async () => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "member1234",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 4: Each member creates multiple articles
  const memberArticleCounts = new Map<string, number>();

  for (const member of members) {
    // Login as this member
    await api.functional.auth.member.login(connection, {
      body: {
        email: member.email,
        password: "member1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });

    // Create 4-5 articles for this member
    const articleCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<4> & tags.Maximum<5>
    >() satisfies number as number;
    const memberArticles = await ArrayUtil.asyncRepeat(
      articleCount,
      async () => {
        const randomCategory = RandomGenerator.pick(categories);
        const statuses = ["draft", "published"] as const;
        const randomStatus = RandomGenerator.pick(statuses);

        const article =
          await api.functional.discussionBoard.member.articles.create(
            connection,
            {
              body: {
                title: RandomGenerator.paragraph({ sentences: 3 }),
                body: RandomGenerator.content({ paragraphs: 3 }),
                discussion_board_article_category_id: randomCategory.id,
                status: randomStatus,
              } satisfies IDiscussionBoardArticle.ICreate,
            },
          );
        typia.assert(article);
        return article;
      },
    );

    memberArticleCounts.set(member.id, memberArticles.length);
  }

  // Step 5: Select target member (first member) for filtering
  const targetMember = members[0];
  const expectedArticleCount = memberArticleCounts.get(targetMember.id) ?? 0;

  // Step 6: Search articles by target member ID
  const page = 1 satisfies number as number;
  const limit = 100 satisfies number as number;

  const searchResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        discussion_board_member_id: targetMember.id,
        page: page,
        limit: limit,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 7: Verify all returned articles are authored by target member
  TestValidator.predicate(
    "search result should contain articles",
    searchResult.data.length > 0,
  );

  for (const article of searchResult.data) {
    TestValidator.equals(
      "article author ID matches target member ID",
      article.author.id,
      targetMember.id,
    );

    TestValidator.equals(
      "article author username matches target member username",
      article.author.username,
      targetMember.username,
    );

    TestValidator.equals(
      "foreign key matches target member ID",
      article.discussion_board_member_id,
      targetMember.id,
    );
  }

  // Step 8: Verify author summary information is correctly populated
  if (searchResult.data.length > 0) {
    const firstArticle = searchResult.data[0];

    TestValidator.equals(
      "author summary contains correct username",
      firstArticle.author.username,
      targetMember.username,
    );

    if (
      targetMember.display_name !== null &&
      targetMember.display_name !== undefined &&
      firstArticle.author.display_name !== null &&
      firstArticle.author.display_name !== undefined
    ) {
      TestValidator.equals(
        "author summary contains correct display name",
        firstArticle.author.display_name,
        targetMember.display_name,
      );
    }
  }

  // Step 9: Test pagination with smaller page size
  const paginatedPage = 1 satisfies number as number;
  const paginatedLimit = 2 satisfies number as number;

  const paginatedResult = await api.functional.discussionBoard.articles.index(
    connection,
    {
      body: {
        discussion_board_member_id: targetMember.id,
        page: paginatedPage,
        limit: paginatedLimit,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(paginatedResult);

  TestValidator.predicate(
    "paginated result should have at most 2 items per page",
    paginatedResult.data.length <= 2,
  );

  for (const article of paginatedResult.data) {
    TestValidator.equals(
      "paginated articles also authored by target member",
      article.author.id,
      targetMember.id,
    );
  }

  // Step 10: Verify that articles from other members are excluded
  const otherMemberIds = members
    .filter((m) => m.id !== targetMember.id)
    .map((m) => m.id);

  for (const article of searchResult.data) {
    TestValidator.predicate(
      "no articles from other members should appear",
      !otherMemberIds.includes(article.author.id),
    );
  }
}
