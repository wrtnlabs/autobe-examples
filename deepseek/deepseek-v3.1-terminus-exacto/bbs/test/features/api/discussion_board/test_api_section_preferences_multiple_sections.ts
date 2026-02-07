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

export async function test_api_section_preferences_multiple_sections(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
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
  // 2. Create two sections
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 3. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 4. Set different preferences for each section
  const section1Preferences = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: true,
    notify_new_comments: false,
    is_hidden: false,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const section2Preferences = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: false,
    notify_new_comments: true,
    is_hidden: true,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const updatedPref1 =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: section1.id,
        body: section1Preferences,
      },
    );
  typia.assert(updatedPref1);
  const updatedPref2 =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: section2.id,
        body: section2Preferences,
      },
    );
  typia.assert(updatedPref2);
  // 5. Retrieve preferences and validate isolation
  const retrievedPref1 =
    await api.functional.discussionBoard.user.sections.preferences.at(
      userConnection,
      {
        sectionId: section1.id,
      },
    );
  typia.assert(retrievedPref1);
  const retrievedPref2 =
    await api.functional.discussionBoard.user.sections.preferences.at(
      userConnection,
      {
        sectionId: section2.id,
      },
    );
  typia.assert(retrievedPref2);
  // 6. Validate preferences are properly isolated
  TestValidator.equals(
    "section1 display order matches",
    retrievedPref1.display_order,
    section1Preferences.display_order,
  );
  TestValidator.equals(
    "section1 notify_new_articles matches",
    retrievedPref1.notify_new_articles,
    section1Preferences.notify_new_articles,
  );
  TestValidator.equals(
    "section1 notify_new_comments matches",
    retrievedPref1.notify_new_comments,
    section1Preferences.notify_new_comments,
  );
  TestValidator.equals(
    "section1 is_hidden matches",
    retrievedPref1.is_hidden,
    section1Preferences.is_hidden,
  );
  TestValidator.equals(
    "section2 display order matches",
    retrievedPref2.display_order,
    section2Preferences.display_order,
  );
  TestValidator.equals(
    "section2 notify_new_articles matches",
    retrievedPref2.notify_new_articles,
    section2Preferences.notify_new_articles,
  );
  TestValidator.equals(
    "section2 notify_new_comments matches",
    retrievedPref2.notify_new_comments,
    section2Preferences.notify_new_comments,
  );
  TestValidator.equals(
    "section2 is_hidden matches",
    retrievedPref2.is_hidden,
    section2Preferences.is_hidden,
  );
  // Validate cross-contamination prevention
  TestValidator.notEquals(
    "section1 and section2 display orders differ",
    retrievedPref1.display_order,
    retrievedPref2.display_order,
  );
  TestValidator.notEquals(
    "section1 and section2 notify_new_articles differ",
    retrievedPref1.notify_new_articles,
    retrievedPref2.notify_new_articles,
  );
  TestValidator.notEquals(
    "section1 and section2 notify_new_comments differ",
    retrievedPref1.notify_new_comments,
    retrievedPref2.notify_new_comments,
  );
  TestValidator.notEquals(
    "section1 and section2 is_hidden differ",
    retrievedPref1.is_hidden,
    retrievedPref2.is_hidden,
  );
  // Validate section relationships
  TestValidator.equals(
    "section1 ID matches",
    retrievedPref1.section.id,
    section1.id,
  );
  TestValidator.equals(
    "section2 ID matches",
    retrievedPref2.section.id,
    section2.id,
  );
}
