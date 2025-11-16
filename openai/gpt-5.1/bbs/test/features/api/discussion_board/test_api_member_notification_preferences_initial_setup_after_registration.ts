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
import type { IDiscussionBoardMemberuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserNotificationPreference";

/**
 * Validate initial setup of member notification preferences after registration
 * and first article creation.
 *
 * Business context: A new discussion board member typically goes through
 * onboarding where they:
 *
 * - Register an account
 * - The platform has at least one category configured by an admin
 * - They post at least one article
 * - Then they configure notification preferences (activity, digest, marketing)
 *
 * This test validates that a freshly registered member user can configure their
 * own notification preferences through the dedicated endpoint after having
 * created an article, and that the server stores and returns those preferences
 * consistently, including idempotent behavior for repeated PUT calls.
 *
 * Steps:
 *
 * 1. Register member user via /auth/memberUser/join, capturing the credential
 *    information (email/password) for later re-login.
 * 2. Register admin user via /auth/adminUser/join.
 * 3. (Optional) Re-login as admin via /auth/adminUser/login to demonstrate token
 *    switching is safe; SDK will update Authorization header accordingly.
 * 4. As admin, create an article category via
 *    /discussionBoard/adminUser/articleCategories with a unique `code`, plus
 *    name/description/order.
 * 5. Switch authentication back to the member user via /auth/memberUser/login
 *    using the original member credentials.
 * 6. As the member, create a discussion article via
 *    /discussionBoard/memberUser/articles using IDiscussionBoardArticle.ICreate
 *    with the categoryId from step 4.
 * 7. Call PUT /discussionBoard/memberUser/notifications/memberUser/preferences
 *    with IDiscussionBoardMemberuserNotificationPreference.IUpdate, setting:
 *
 *    - Activity_notifications_enabled = true
 *    - Digest_notifications_enabled = true
 *    - Marketing_notifications_enabled = false
 * 8. Assert that the returned IDiscussionBoardMemberuserNotificationPreference has
 *    flags matching the request and a coherent created_at/updated_at ordering.
 * 9. Call the same PUT again with the identical payload and verify:
 *
 *    - Flags remain the same
 *    - Updated_at is not earlier than the first response's updated_at
 */
export async function test_api_member_notification_preferences_initial_setup_after_registration(
  connection: api.IConnection,
) {
  // 1. Register member user
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Register admin user
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
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

  // 3. (Optional) Re-login as admin using explicit login endpoint
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 4. Create article category as admin
  const categoryCodeBase = "ECONOMY";
  const categoryCode = `${categoryCodeBase}_${RandomGenerator.alphaNumeric(8)}`;

  const categoryCreateBody = {
    code: categoryCode,
    name: "Economy & Markets",
    description: RandomGenerator.paragraph({ sentences: 2 }),
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

  TestValidator.equals(
    "article category code should match request",
    category.code,
    categoryCreateBody.code,
  );

  // 5. Switch back to member user via login to ensure current actor is member
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoginAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 6. Create an article as the member user using the created category
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

  TestValidator.equals(
    "article category id should match assigned category",
    article.category.id,
    category.id,
  );

  // 7. First notification preference update as member user
  const preferenceUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardMemberuserNotificationPreference.IUpdate;

  const preference1: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: preferenceUpdateBody,
      },
    );
  typia.assert(preference1);

  TestValidator.equals(
    "activity flag should match first update payload",
    preference1.activity_notifications_enabled,
    preferenceUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag should match first update payload",
    preference1.digest_notifications_enabled,
    preferenceUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag should match first update payload",
    preference1.marketing_notifications_enabled,
    preferenceUpdateBody.marketing_notifications_enabled,
  );

  // created_at should not be after updated_at (created_at <= updated_at)
  TestValidator.predicate("created_at should be <= updated_at", () => {
    const created = new Date(preference1.created_at).getTime();
    const updated = new Date(preference1.updated_at).getTime();
    return created <= updated;
  });

  // 8. Second call for idempotency check
  const preference2: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: preferenceUpdateBody,
      },
    );
  typia.assert(preference2);

  // Flags must remain identical
  TestValidator.equals(
    "activity flag should remain identical on second update",
    preference2.activity_notifications_enabled,
    preferenceUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag should remain identical on second update",
    preference2.digest_notifications_enabled,
    preferenceUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag should remain identical on second update",
    preference2.marketing_notifications_enabled,
    preferenceUpdateBody.marketing_notifications_enabled,
  );

  // updated_at on second response should be >= first updated_at
  TestValidator.predicate(
    "second updated_at should be >= first updated_at for idempotent update",
    () => {
      const updated1 = new Date(preference1.updated_at).getTime();
      const updated2 = new Date(preference2.updated_at).getTime();
      return updated2 >= updated1;
    },
  );
}
