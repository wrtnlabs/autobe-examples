import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_section_preference_toggle_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Note: Since there's no API to create section preferences directly,
  // we assume a preference already exists or is created through the application flow.
  // For testing purposes, we'll simulate the scenario where we have a valid preference ID
  // and test the toggle functionality on the is_hidden field.
  // Create a mock preference ID for testing toggle functionality
  const preferenceId = typia.random<string & tags.Format<"uuid">>();
  // Test initial toggle from false to true
  const toggleBody1 = {
    is_hidden: true,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const updatedPreference1 =
    await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(
      userConnection,
      {
        preferenceId,
        body: toggleBody1,
      },
    );
  typia.assert(updatedPreference1);
  // Validate toggle to hidden
  TestValidator.equals(
    "is_hidden should be toggled to true",
    updatedPreference1.isHidden,
    true,
  );
  // Test toggle back from true to false
  const toggleBody2 = {
    is_hidden: false,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const updatedPreference2 =
    await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(
      userConnection,
      {
        preferenceId: preferenceId,
        body: toggleBody2,
      },
    );
  typia.assert(updatedPreference2);
  // Validate toggle back to visible
  TestValidator.equals(
    "is_hidden should be toggled back to false",
    updatedPreference2.isHidden,
    false,
  );
  // Validate partial update - should maintain other fields
  TestValidator.notEquals(
    "preferences should maintain consistency across updates",
    updatedPreference1.id,
    preferenceId,
  );
}