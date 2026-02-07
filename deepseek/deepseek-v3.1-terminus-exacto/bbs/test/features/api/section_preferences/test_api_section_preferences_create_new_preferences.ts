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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test creating new section preferences when no existing preferences exist for the user-section combination.
 * The system should automatically create a new preference record with the provided values.
 * Verify that all fields are properly initialized with default values where not specified,
 * and that the created record includes correct user and section associations.
 */
export async function test_api_section_preferences_create_new_preferences(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a section using available utility function
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Test Section",
        description: "Test section for preference testing",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create and authenticate regular user using available utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user_password_123",
      display_name: "Test User",
      bio: "Test user bio",
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // 4. Create new section preferences with partial update data
  const preferenceData: IDiscussionBoardSectionPreference.IUpdate = {
    display_order: 5,
    notify_new_articles: true,
    notify_new_comments: false,
    is_hidden: false,
  };
  const preference =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: preferenceData,
      },
    );
  typia.assert(preference);
  // 5. Validate the created preference record
  TestValidator.equals(
    "preference id should be UUID",
    typeof preference.id,
    "string",
  );
  TestValidator.equals(
    "section association should match",
    preference.section.id,
    section.id,
  );
  TestValidator.equals(
    "user association should match",
    preference.user.id,
    userAuth.id,
  );
  TestValidator.equals(
    "display order should match input",
    preference.display_order,
    5,
  );
  TestValidator.equals(
    "notify new articles should match input",
    preference.notify_new_articles,
    true,
  );
  TestValidator.equals(
    "notify new comments should match input",
    preference.notify_new_comments,
    false,
  );
  TestValidator.equals(
    "is hidden should match input",
    preference.is_hidden,
    false,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    () => !isNaN(new Date(preference.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(preference.updated_at).getTime()),
  );
}
