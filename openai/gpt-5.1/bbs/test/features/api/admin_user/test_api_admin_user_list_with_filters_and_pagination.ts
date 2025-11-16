import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuser";

export async function test_api_admin_user_list_with_filters_and_pagination(
  connection: api.IConnection,
) {
  /**
   * 1. Register and authenticate a new admin user via join API.
   *
   *    - Use a unique, realistic email and password.
   *    - Rely on SDK to attach admin JWT to connection headers.
   */
  const adminEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin!2345", // satisfies string & tags.Format<"password">
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  /** 2. (Optional realism) Create an article category as the admin. */
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  /**
   * 3. (Optional realism) Create a member user and an article in the created
   *    category.
   */
  const memberEmail = `${RandomGenerator.alphabets(8)}@member.example.com`;
  const memberJoinBody = {
    email: memberEmail,
    password: "Member!2345",
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  /**
   * 4. Ensure we are authenticated as admin before calling adminUsers.index. join
   *    already authenticated us, but we can explicitly login again to validate
   *    login flow and re-attach token.
   */
  const adminLoginBody = {
    email: adminEmail,
    password: "Admin!2345",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  /** 5. Call adminUsers.index with filters and pagination. */
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    search: adminEmail,
    status: "active",
    orderBy: "createdAt",
    orderDirection: "asc" as const,
    page,
    limit,
  } satisfies IDiscussionBoardAdminuser.IRequest;

  const pageResult: IPageIDiscussionBoardAdminuser.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  /** 6. Validate pagination metadata consistency. */
  const pagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination.records must be >= number of returned summaries",
    pagination.records >= pageResult.data.length,
  );

  TestValidator.predicate(
    "pagination.pages must be >= 0",
    pagination.pages >= 0,
  );

  /** 7. Validate that the newly created admin appears in the data array. */
  const foundAdmin = pageResult.data.find((summary) => {
    return summary.email === adminEmail;
  });

  TestValidator.predicate(
    "admin list should contain the newly created admin by email",
    !!foundAdmin,
  );

  if (foundAdmin) {
    typia.assert(foundAdmin);

    TestValidator.equals(
      "found admin email must match created admin email",
      foundAdmin.email,
      adminEmail,
    );

    TestValidator.predicate(
      "found admin display_name must be non-empty",
      foundAdmin.display_name.length > 0,
    );
  }

  /** 8. Optional second pagination scenario with different limit. */
  const secondLimit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const secondRequestBody = {
    orderBy: "createdAt",
    orderDirection: "asc" as const,
    page,
    limit: secondLimit,
  } satisfies IDiscussionBoardAdminuser.IRequest;

  const secondPageResult: IPageIDiscussionBoardAdminuser.ISummary =
    await api.functional.discussionBoard.adminUser.adminUsers.index(
      connection,
      {
        body: secondRequestBody,
      },
    );
  typia.assert(secondPageResult);

  const secondPagination = secondPageResult.pagination;
  typia.assert(secondPagination);

  TestValidator.equals(
    "second pagination.limit should equal requested secondLimit",
    secondPagination.limit,
    secondLimit,
  );

  TestValidator.predicate(
    "second page data length should be <= secondLimit",
    secondPageResult.data.length <= secondLimit,
  );
}
