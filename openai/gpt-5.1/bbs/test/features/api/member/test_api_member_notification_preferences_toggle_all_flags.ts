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

export async function test_api_member_notification_preferences_toggle_all_flags(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) and obtain authenticated member session
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);

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

  // 2. Register a new admin user and obtain admin session
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
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
    code: `CODE_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    order: typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 4. Switch back to member actor using login
  const memberLoginBody = {
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  TestValidator.equals(
    "logged-in member id should match joined member id",
    memberLoggedIn.id,
    memberAuthorized.id,
  );

  // 5. As member, create an article linked to the created category
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

  // 6. First preference configuration: all flags true
  const firstUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardMemberuserNotificationPreference.IUpdate;

  const firstPreference: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(firstPreference);

  TestValidator.predicate(
    "first update - activity notifications should be enabled",
    firstPreference.activity_notifications_enabled === true,
  );
  TestValidator.predicate(
    "first update - digest notifications should be enabled",
    firstPreference.digest_notifications_enabled === true,
  );
  TestValidator.predicate(
    "first update - marketing notifications should be enabled",
    firstPreference.marketing_notifications_enabled === true,
  );

  TestValidator.equals(
    "first update - member id in preferences should match member user id",
    firstPreference.discussion_board_memberuser_id,
    memberAuthorized.id,
  );

  // 7. Second preference configuration: all flags false (overwrite)
  const secondUpdateBody = {
    activity_notifications_enabled: false,
    digest_notifications_enabled: false,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardMemberuserNotificationPreference.IUpdate;

  const secondPreference: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(secondPreference);

  TestValidator.predicate(
    "second update - activity notifications should be disabled",
    secondPreference.activity_notifications_enabled === false,
  );
  TestValidator.predicate(
    "second update - digest notifications should be disabled",
    secondPreference.digest_notifications_enabled === false,
  );
  TestValidator.predicate(
    "second update - marketing notifications should be disabled",
    secondPreference.marketing_notifications_enabled === false,
  );

  // Ensure preferences still belong to the same member and likely the same record
  TestValidator.equals(
    "second update - member id in preferences should still match member user id",
    secondPreference.discussion_board_memberuser_id,
    memberAuthorized.id,
  );

  TestValidator.equals(
    "preference record id should remain the same between first and second updates",
    secondPreference.id,
    firstPreference.id,
  );
}
