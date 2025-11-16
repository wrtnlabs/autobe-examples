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

/**
 * Validate administrative member user search and pagination behavior.
 *
 * This E2E test exercises the PATCH /discussionBoard/adminUser/memberUsers
 * endpoint under an authenticated adminUser context. It focuses on verifying
 * that:
 *
 * 1. An adminUser can search and paginate over member accounts.
 * 2. Pagination metadata (current, limit, records, pages) is consistent with the
 *    returned data slice.
 * 3. Filtering by the `search` field using a unique member email yields a result
 *    set that corresponds to the expected subset of accounts.
 * 4. Sorting by an activity-related field (`last_login_at`) in descending order
 *    works without error.
 *
 * Business-context steps:
 *
 * 1. Register an adminUser and rely on the SDK to attach its access token to the
 *    connection.
 * 2. As that adminUser, create an article category to simulate realistic
 *    discussion-board configuration.
 * 3. Register two distinct memberUser accounts, each with valid profile and
 *    session context fields.
 * 4. Log both member users in, with the second member receiving an additional
 *    login so that it is the most recently active account among the two.
 * 5. Have each member user create an article using the shared category, providing
 *    realistic activity context.
 * 6. Switch the connection back to the adminUser by logging in again.
 * 7. Call the memberUsers search endpoint with a broad filter and verify
 *    pagination metadata and type correctness.
 * 8. Perform a targeted search using `search` set to the recent member's email and
 *    assert that the returned summaries correspond to that member account (by
 *    id) and that pagination metadata reflects at least one matching record.
 */
export async function test_api_admin_member_user_search_with_activity_window(
  connection: api.IConnection,
) {
  // 1. Register an admin user and obtain authorized context via SDK
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(6)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Helper to build member join/login URLs
  const memberHref = "https://board.example.com" as string & tags.Format<"uri">;
  const memberReferrer = "https://board.example.com/landing" as string &
    tags.Format<"uri">;

  // 3. Register two member users
  const member1JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member1Auth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member1JoinBody,
    });
  typia.assert(member1Auth);

  const member2JoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Busan",
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member2Auth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: member2JoinBody,
    });
  typia.assert(member2Auth);

  // 4. Log both member users in to set last_login_at, making member2 the most recent
  // Login as member1
  const member1LoginBody = {
    email: member1JoinBody.email,
    password: member1JoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const member1LoginAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member1LoginBody,
    });
  typia.assert(member1LoginAuth);

  // Login as member2 twice to make it the latest last_login_at
  const member2LoginBody = {
    email: member2JoinBody.email,
    password: member2JoinBody.password,
    ip: null,
    href: memberHref,
    referrer: memberReferrer,
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const member2LoginAuth1: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginBody,
    });
  typia.assert(member2LoginAuth1);

  const member2LoginAuth2: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: member2LoginBody,
    });
  typia.assert(member2LoginAuth2);

  // 5. Have each member create an article under the shared category
  const articleBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article1: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody1 },
    );
  typia.assert(article1);

  const articleBody2 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article2: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody2 },
    );
  typia.assert(article2);

  // 6. Switch back to adminUser context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuth: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 7. Broad member search with pagination and sorting
  const broadSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    email_verified: null,
    account_statuses: undefined,
    created_from: null,
    created_to: null,
    last_login_from: null,
    last_login_to: null,
    search: undefined,
    order_by: "last_login_at",
    order_direction: "desc" as const,
  } satisfies IDiscussionBoardMemberuser.IRequest;

  const broadPage: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: broadSearchRequest },
    );
  typia.assert(broadPage);

  const pagination1: IPage.IPagination = broadPage.pagination;
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pagination1.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    pagination1.limit > 0,
  );
  TestValidator.predicate(
    "records should be >= data length",
    pagination1.records >= broadPage.data.length,
  );

  // We expect at least 2 records system-wide (our two members),
  // but other fixtures may exist too.
  TestValidator.predicate(
    "records should be at least two",
    pagination1.records >= 2,
  );

  // 8. Targeted search by the recent member's email
  const targetedSearchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    email_verified: null,
    account_statuses: undefined,
    created_from: null,
    created_to: null,
    last_login_from: null,
    last_login_to: null,
    search: member2JoinBody.email,
    order_by: "last_login_at",
    order_direction: "desc" as const,
  } satisfies IDiscussionBoardMemberuser.IRequest;

  const targetedPage: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: targetedSearchRequest },
    );
  typia.assert(targetedPage);

  const pagination2: IPage.IPagination = targetedPage.pagination;
  TestValidator.predicate(
    "targeted search should return at least one record",
    pagination2.records >= 1,
  );
  TestValidator.predicate(
    "targeted search data length should be > 0 when records >= 1",
    targetedPage.data.length > 0,
  );

  const member2Id = member2Auth.id;
  const containsMember2 = targetedPage.data.some(
    (summary) => summary.id === member2Id,
  );
  TestValidator.predicate(
    "targeted search by unique email should include the expected member",
    containsMember2,
  );
}
