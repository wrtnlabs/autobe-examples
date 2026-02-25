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

export async function test_api_user_section_preference_creation_with_custom_settings(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminCredentials);
  // Create a section as administrator
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userCredentials);
  // Create section preferences with custom settings
  const randomDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const preferenceBody = {
    discussion_board_section_id: section.id,
    display_order: randomDisplayOrder,
    notify_new_articles: true,
    notify_new_comments: false,
    is_hidden: false,
  } satisfies IDiscussionBoardSectionPreference.ICreate;
  const preference =
    await generate_random_discussion_board_user_profile_sections_preferences_create(
      userConnection,
      { body: preferenceBody },
    );
  typia.assert(preference);
  // Validate preference settings
  TestValidator.equals("section id matches", preference.section.id, section.id);
  TestValidator.equals(
    "display order matches input",
    preference.displayOrder,
    preferenceBody.display_order,
  );
  TestValidator.equals(
    "notify new articles matches input",
    preference.notifyNewArticles,
    preferenceBody.notify_new_articles,
  );
  TestValidator.equals(
    "notify new comments matches input",
    preference.notifyNewComments,
    preferenceBody.notify_new_comments,
  );
  TestValidator.equals(
    "hidden setting matches input",
    preference.isHidden,
    preferenceBody.is_hidden,
  );
  TestValidator.predicate(
    "preference has created timestamp",
    preference.createdAt !== undefined,
  );
  TestValidator.predicate(
    "preference has updated timestamp",
    preference.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "preference has section summary",
    preference.section !== undefined,
  );
  TestValidator.predicate(
    "preference has user summary",
    preference.user !== undefined,
  );
}
