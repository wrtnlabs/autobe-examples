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
 * Validate that admin free-text member search filters by profile fields.
 *
 * Business goal: Ensure PATCH /discussionBoard/adminUser/memberUsers applies
 * the `search` field from IDiscussionBoardMemberuser.IRequest to member profile
 * fields (such as display_name) so that only accounts whose profile contains
 * the search term are returned.
 *
 * High level steps:
 *
 * 1. Create an admin user and authenticate as that admin.
 * 2. As admin, create an article category to support article creation.
 * 3. Create one target member with a unique keyword in displayName and at least
 *    one article, and one or more noise members without that keyword who also
 *    create articles.
 * 4. Switch back to the admin user context.
 * 5. Call the administrative member search endpoint with `search` set to the
 *    unique keyword and broad filters.
 * 6. Verify that only the target member appears in the paginated results and noise
 *    members are excluded.
 */
export async function test_api_admin_member_user_search_by_free_text(
  connection: api.IConnection,
) {
  // Helper to generate common href/referrer used for join/login
  const href: string & tags.Format<"uri"> =
    "https://discussion-board.example.com/" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://discussion-board.example.com/landing" as string &
      tags.Format<"uri">;

  // 1. Register an admin user (also authenticates as that admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminP@ssw0rd!", // satisfies Format<"password">
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create an article category
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
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

  // 3. Create member users
  const searchKeyword = "unique_keyword";

  // 3-1. Target member: displayName contains the keyword
  const targetMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const targetJoinBody = {
    email: targetMemberEmail,
    password: "MemberP@ssw0rd!",
    displayName: `Target ${searchKeyword} User`,
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const targetAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: targetJoinBody,
    });
  typia.assert(targetAuthorized);

  // MemberUser article creation requires memberUser auth token which join set.
  const targetArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const targetArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: targetArticleBody },
    );
  typia.assert(targetArticle);

  // 3-2. Noise members without the keyword in any profile field
  const noiseMembers: IDiscussionBoardMemberuser.IAuthorized[] = [];

  const noiseCount: number = 2;
  for (let i = 0; i < noiseCount; i++) {
    const noiseEmail: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();

    const noiseJoinBody = {
      email: noiseEmail,
      password: "MemberP@ssw0rd!",
      displayName: `Noise User ${i + 1}`,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      location: "Busan",
      ip: null,
      href,
      referrer,
    } satisfies IDiscussionBoardMemberUserJoin.IRequest;

    const noiseAuthorized: IDiscussionBoardMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: noiseJoinBody,
      });
    typia.assert(noiseAuthorized);
    noiseMembers.push(noiseAuthorized);

    const noiseArticleBody = {
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
      summary: RandomGenerator.paragraph({ sentences: 2 }),
      categoryId: category.id,
    } satisfies IDiscussionBoardArticle.ICreate;

    const noiseArticle: IDiscussionBoardArticle =
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        { body: noiseArticleBody },
      );
    typia.assert(noiseArticle);
  }

  // 4. Switch back to admin user context with explicit login
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminP@ssw0rd!",
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 5. Perform member search with free-text keyword
  const searchRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    email_verified: null,
    account_statuses: undefined,
    created_from: null,
    created_to: null,
    last_login_from: null,
    last_login_to: null,
    search: searchKeyword,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardMemberuser.IRequest;

  const pageResult: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert(pageResult);

  const summaries = pageResult.data;

  // Ensure at least one result contains the keyword and matches target member
  const targetSummary = summaries.find((s) => s.id === targetAuthorized.id);

  TestValidator.predicate(
    "search results should include the target member with keyword in display_name",
    targetSummary !== undefined &&
      targetSummary.display_name.includes(searchKeyword),
  );

  // Ensure noise members are not returned (no false positives)
  for (const noise of noiseMembers) {
    const foundNoise = summaries.find((s) => s.id === noise.id);
    TestValidator.predicate(
      "search results should not include noise members without keyword",
      foundNoise === undefined,
    );
  }
}
