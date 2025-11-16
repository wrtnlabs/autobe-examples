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

export async function test_api_admin_member_user_detail_for_restricted_account(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/register",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Login as that member user to simulate activity and update last_login_at
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.example.com/login",
    referrer: "https://frontend.example.com/register",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberAuthorizedAfterLogin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedAfterLogin);

  // 3. Register an admin user (join) to create categories
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(18),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/admin/register",
    referrer: "https://frontend.example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, create an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 5. Switch back to memberUser context via login (connection headers auto managed)
  const memberAuthorizedForArticle: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedForArticle);

  // 6. As memberUser, create an article using the created category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
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

  TestValidator.equals(
    "article category should match created category",
    article.category.id,
    category.id,
  );

  // 7. Ensure we are authenticated as adminUser again before calling admin endpoint
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://frontend.example.com/admin/login",
    referrer: "https://frontend.example.com/admin/register",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedAfterLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedAfterLogin);

  // Helper for optional date-time validation
  const checkOptionalDateTime = (
    title: string,
    value: string | null | undefined,
  ) => {
    if (value === null || value === undefined) return;
    typia.assert<string & tags.Format<"date-time">>(value);
    TestValidator.predicate(title, value.length > 0);
  };

  // 8. As adminUser, retrieve member user details by memberUserId
  const memberDetail: IDiscussionBoardMemberuser =
    await api.functional.discussionBoard.adminUser.memberUsers.at(connection, {
      memberUserId: memberAuthorized.id,
    });
  typia.assert(memberDetail);

  // 9. Validate essential identity fields
  TestValidator.equals(
    "member id from detail should match joined member id",
    memberDetail.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "member email from detail should match joined member email",
    memberDetail.email,
    memberAuthorized.email,
  );

  // 10. Validate lifecycle and restriction-related fields shape
  TestValidator.predicate(
    "account_status should be a non-empty string",
    memberDetail.account_status.length > 0,
  );

  checkOptionalDateTime(
    "deleted_at, when present, must be a valid date-time",
    memberDetail.deleted_at ?? null,
  );
  checkOptionalDateTime(
    "closed_at, when present, must be a valid date-time",
    memberDetail.closed_at ?? null,
  );
  checkOptionalDateTime(
    "last_login_at, when present, must be a valid date-time",
    memberDetail.last_login_at ?? null,
  );

  TestValidator.predicate(
    "closed_by_admin should be a boolean flag (always defined)",
    typeof memberDetail.closed_by_admin === "boolean",
  );
}
