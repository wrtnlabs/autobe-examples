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

export async function test_api_section_preferences_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Update admin connection with authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a section using admin
  const section = await generate_random_discussion_board_admin_sections_create(
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
  typia.assert(section);
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuthorized);
  // Update user connection with authorization token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${userAuthorized.token.access}`,
  };
  // Set initial preferences for the section
  const initialPreferences: IDiscussionBoardSectionPreference.IUpdate = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: typia.random<boolean>(),
    notify_new_comments: typia.random<boolean>(),
    is_hidden: typia.random<boolean>(),
  };
  const setPreferences =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: initialPreferences,
      },
    );
  typia.assert(setPreferences);
  // Retrieve the preferences
  const retrievedPreferences =
    await api.functional.discussionBoard.user.sections.preferences.at(
      userConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(retrievedPreferences);
  // Validate that retrieved preferences match the initial settings
  TestValidator.equals(
    "display_order matches",
    retrievedPreferences.display_order,
    initialPreferences.display_order,
  );
  TestValidator.equals(
    "notify_new_articles matches",
    retrievedPreferences.notify_new_articles,
    initialPreferences.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments matches",
    retrievedPreferences.notify_new_comments,
    initialPreferences.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden matches",
    retrievedPreferences.is_hidden,
    initialPreferences.is_hidden,
  );
  // Validate section information
  TestValidator.equals(
    "section ID matches",
    retrievedPreferences.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrievedPreferences.section.name,
    section.name,
  );
}
