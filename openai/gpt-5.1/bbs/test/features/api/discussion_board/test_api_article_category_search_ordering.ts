import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Verify that article category search respects order_by and order_direction.
 *
 * Business flow:
 *
 * 1. Register an adminUser to obtain admin authentication context.
 * 2. As the adminUser, create three categories with distinct `order` values (1, 5,
 *    10) and unique codes.
 * 3. Query PATCH /discussionBoard/articleCategories with order_by = "order",
 *    order_direction = "asc" and verify ascending order of the three created
 *    categories.
 * 4. Query again with order_by = "order", order_direction = "desc" and verify
 *    descending order.
 * 5. Additionally, query with order_by = "created_at" and verify that creation
 *    order is reflected in created_at ordering for these categories.
 */
export async function test_api_article_category_search_ordering(
  connection: api.IConnection,
) {
  // 1. Join admin user (adminUser actor)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://example.com/admin/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed three categories with specific order values
  const baseCode = RandomGenerator.alphaNumeric(8).toUpperCase();
  const createCategory = async (
    suffix: string,
    order: number & tags.Type<"int32">,
  ): Promise<IDiscussionBoardArticleCategory> => {
    const body = {
      code: `${baseCode}_${suffix}`,
      name: RandomGenerator.name(2),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      order,
    } satisfies IDiscussionBoardArticleCategory.ICreate;

    const created: IDiscussionBoardArticleCategory =
      await api.functional.discussionBoard.adminUser.articleCategories.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  };

  const catLow = await createCategory("LOW", 1 as number & tags.Type<"int32">);
  const catMedium = await createCategory(
    "MEDIUM",
    5 as number & tags.Type<"int32">,
  );
  const catHigh = await createCategory(
    "HIGH",
    10 as number & tags.Type<"int32">,
  );

  // Helper to fetch a page including our categories
  const fetchPage = async (
    order_by: string | null | undefined,
    order_direction: string | null | undefined,
  ): Promise<IPageIDiscussionBoardArticleCategory.ISummary> => {
    const body = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
      search: null,
      codes: [catLow.code, catMedium.code, catHigh.code],
      order_by,
      order_direction,
    } satisfies IDiscussionBoardArticleCategory.IRequest;

    const page = await api.functional.discussionBoard.articleCategories.index(
      connection,
      {
        body,
      },
    );
    typia.assert(page);
    return page;
  };

  // 3. Ascending order by `order`
  const ascPage = await fetchPage("order", "asc");

  const ascIndices = [catLow, catMedium, catHigh].map((cat) =>
    ascPage.data.findIndex((s) => s.id === cat.id),
  );

  TestValidator.predicate(
    "all three categories appear in asc page",
    ascIndices.every((idx) => idx >= 0),
  );

  TestValidator.predicate(
    "ascending order_by=order: LOW before MEDIUM",
    ascIndices[0] < ascIndices[1],
  );
  TestValidator.predicate(
    "ascending order_by=order: MEDIUM before HIGH",
    ascIndices[1] < ascIndices[2],
  );

  // 4. Descending order by `order`
  const descPage = await fetchPage("order", "desc");
  const descIndices = [catLow, catMedium, catHigh].map((cat) =>
    descPage.data.findIndex((s) => s.id === cat.id),
  );

  TestValidator.predicate(
    "all three categories appear in desc page",
    descIndices.every((idx) => idx >= 0),
  );

  TestValidator.predicate(
    "descending order_by=order: HIGH before MEDIUM",
    descIndices[2] < descIndices[1],
  );
  TestValidator.predicate(
    "descending order_by=order: MEDIUM before LOW",
    descIndices[1] < descIndices[0],
  );

  // 5. Verify created_at ordering
  const createdAtAscPage = await fetchPage("created_at", "asc");
  const createdAtAscIndices = [catLow, catMedium, catHigh].map((cat) =>
    createdAtAscPage.data.findIndex((s) => s.id === cat.id),
  );

  TestValidator.predicate(
    "created_at asc page contains all three categories",
    createdAtAscIndices.every((idx) => idx >= 0),
  );

  TestValidator.predicate(
    "created_at asc respects creation order: LOW before MEDIUM",
    createdAtAscIndices[0] < createdAtAscIndices[1],
  );
  TestValidator.predicate(
    "created_at asc respects creation order: MEDIUM before HIGH",
    createdAtAscIndices[1] < createdAtAscIndices[2],
  );
}
