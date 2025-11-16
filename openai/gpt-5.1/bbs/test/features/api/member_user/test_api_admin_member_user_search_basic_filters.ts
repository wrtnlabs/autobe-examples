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
import type { IPageIDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberuser";

export async function test_api_admin_member_user_search_basic_filters(
  connection: api.IConnection,
) {
  // 1) Admin bootstrap (adminUser join)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminJoinResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 2) Admin creates an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
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

  // 3) Member bootstrap (memberUser join)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberJoinResult: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinResult);

  // Member creates an article under the created category
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

  // 4) Switch back to admin actor via login (member join overwrote Authorization)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 5) Execute memberUsers search with basic filters as adminUser
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    email_verified: null,
    account_statuses: ["active"],
    created_from: null,
    created_to: null,
    last_login_from: null,
    last_login_to: null,
    search: "",
    order_by: "created_at",
    order_direction: "desc" as const,
  } satisfies IDiscussionBoardMemberuser.IRequest;

  const pageResult: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 6) Validate pagination invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is within 0..100",
    pagination.limit >= 0 && pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  if (pageResult.data.length === 0) {
    TestValidator.equals("when no data, records is 0", pagination.records, 0);
    TestValidator.equals("when no data, pages is 0", pagination.pages, 0);
  } else {
    TestValidator.predicate(
      "when data exists, records >= data.length",
      pagination.records >= pageResult.data.length,
    );
  }

  // 7) Validate each member summary
  for (const summary of pageResult.data) {
    typia.assert<IDiscussionBoardMemberuser.ISummary>(summary);

    TestValidator.predicate(
      "member summary account_status is active",
      summary.account_status === "active",
    );
  }

  // 8) Optional existence assertion: at least one active member likely exists
  if (pageResult.data.length > 0) {
    TestValidator.predicate(
      "search returns at least one active member",
      pageResult.data.some(
        (it: IDiscussionBoardMemberuser.ISummary) =>
          it.account_status === "active",
      ),
    );
  }
}
