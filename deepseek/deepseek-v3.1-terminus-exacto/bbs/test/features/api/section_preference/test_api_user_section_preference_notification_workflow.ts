import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_profile_sections_preferences_create } from "../../../generate/generate_random_discussion_board_user_profile_sections_preferences_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_preference } from "../../../prepare/prepare_random_discussion_board_section_preference";

export async function test_api_user_section_preference_notification_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create multiple sections with different configurations
  const section1 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 2,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  const section3 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 3,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section3);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create different section preferences for the user
  // Section 1: Enable new article notifications
  const preference1 =
    await api.functional.discussionBoard.user.profile.sections.preferences.create(
      userConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
          display_order: 1,
          notify_new_articles: true,
          notify_new_comments: false,
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.ICreate,
      },
    );
  typia.assert(preference1);
  // Section 2: Enable comment notifications
  const preference2 =
    await api.functional.discussionBoard.user.profile.sections.preferences.create(
      userConnection,
      {
        body: {
          discussion_board_section_id: section2.id,
          display_order: 2,
          notify_new_articles: false,
          notify_new_comments: true,
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.ICreate,
      },
    );
  typia.assert(preference2);
  // Section 3: Hidden section with notifications disabled
  const preference3 =
    await api.functional.discussionBoard.user.profile.sections.preferences.create(
      userConnection,
      {
        body: {
          discussion_board_section_id: section3.id,
          display_order: 3,
          notify_new_articles: false,
          notify_new_comments: false,
          is_hidden: true,
        } satisfies IDiscussionBoardSectionPreference.ICreate,
      },
    );
  typia.assert(preference3);
  // 4. Validate that all preferences are correctly saved
  TestValidator.equals(
    "preference1 section matches",
    preference1.section.id,
    section1.id,
  );
  TestValidator.equals(
    "preference1 notify_new_articles",
    preference1.notifyNewArticles,
    true,
  );
  TestValidator.equals(
    "preference1 notify_new_comments",
    preference1.notifyNewComments,
    false,
  );
  TestValidator.equals("preference1 is_hidden", preference1.isHidden, false);
  TestValidator.equals(
    "preference2 section matches",
    preference2.section.id,
    section2.id,
  );
  TestValidator.equals(
    "preference2 notify_new_articles",
    preference2.notifyNewArticles,
    false,
  );
  TestValidator.equals(
    "preference2 notify_new_comments",
    preference2.notifyNewComments,
    true,
  );
  TestValidator.equals("preference2 is_hidden", preference2.isHidden, false);
  TestValidator.equals(
    "preference3 section matches",
    preference3.section.id,
    section3.id,
  );
  TestValidator.equals(
    "preference3 notify_new_articles",
    preference3.notifyNewArticles,
    false,
  );
  TestValidator.equals(
    "preference3 notify_new_comments",
    preference3.notifyNewComments,
    false,
  );
  TestValidator.equals("preference3 is_hidden", preference3.isHidden, true);
  // 5. Validate notification system integration
  TestValidator.predicate(
    "preference1 should trigger article notifications",
    preference1.notifyNewArticles === true,
  );
  TestValidator.predicate(
    "preference2 should trigger comment notifications",
    preference2.notifyNewComments === true,
  );
  TestValidator.predicate(
    "preference3 should not trigger any notifications",
    preference3.notifyNewArticles === false &&
      preference3.notifyNewComments === false,
  );
  // Validate display order sequence
  TestValidator.equals(
    "preference1 display order",
    preference1.displayOrder,
    1,
  );
  TestValidator.equals(
    "preference2 display order",
    preference2.displayOrder,
    2,
  );
  TestValidator.equals(
    "preference3 display order",
    preference3.displayOrder,
    3,
  );
  // Validate user association
  TestValidator.predicate(
    "preference1 has valid user",
    preference1.user.id !== undefined,
  );
  TestValidator.predicate(
    "preference2 has valid user",
    preference2.user.id !== undefined,
  );
  TestValidator.predicate(
    "preference3 has valid user",
    preference3.user.id !== undefined,
  );
}
