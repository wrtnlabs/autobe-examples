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
import type { IDiscussionBoardMemberuserRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserRestriction";

/**
 * Validate that a restricted member user cannot create discussion board
 * articles.
 *
 * Business goal:
 *
 * - When an administrator applies a blocking restriction to a member user, that
 *   member must not be able to create new articles via the memberUser
 *   article-creation endpoint.
 *
 * Test workflow:
 *
 * 1. Register a new member user (join) and keep their credentials and ID.
 * 2. Register an admin user (join) and switch authorization context to admin.
 * 3. As admin, create an article category to be used by the member when attempting
 *    to create an article.
 * 4. As admin, apply a blocking restriction to the member using the
 *    memberUsers.restriction.create API.
 * 5. Switch back to the member user context (login) so the subsequent operations
 *    are executed as the restricted member.
 * 6. As the restricted member, attempt to create a new article using the
 *    previously created category.
 * 7. Assert that the article creation fails (throws) due to the restriction, using
 *    TestValidator.error.
 *
 * Implementation note:
 *
 * - We cannot directly list or read articles to assert non-persistence with the
 *   provided SDK, so we treat the failure of the create() call as the
 *   enforcement of the restriction and thus sufficient to prove that no article
 *   is created.
 */
export async function test_api_article_creation_restricted_by_member_restriction_state(
  connection: api.IConnection,
) {
  // 1. Register a member user and keep credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "P@ssw0rd!123";

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // Capture member id for restriction creation later
  const memberUserId: string & tags.Format<"uuid"> = memberAuthorized.id;

  // 2. Register an admin user (this will also set the admin token on connection)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "Adm1nP@ss!";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 3. As admin, create an article category
  const categoryCreateBody = {
    code: `E2E_RESTRICT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
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

  // 4. As admin, apply a blocking restriction to the member
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const restrictionCreateBody = {
    restriction_level: "full_block",
    reason_category: "e2e_block_test",
    started_at: nowIso,
    ended_at: null,
  } satisfies IDiscussionBoardMemberuserRestriction.ICreate;

  const restriction: IDiscussionBoardMemberuserRestriction =
    await api.functional.discussionBoard.adminUser.memberUsers.restriction.create(
      connection,
      {
        memberUserId: memberUserId,
        body: restrictionCreateBody,
      },
    );
  typia.assert(restriction);

  // 5. Switch back to member user context via login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberReAuth: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReAuth);

  // 6. As the restricted member, attempt to create a new article
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  await TestValidator.error(
    "restricted member cannot create article",
    async () => {
      await api.functional.discussionBoard.memberUser.articles.create(
        connection,
        {
          body: articleCreateBody,
        },
      );
    },
  );
}
