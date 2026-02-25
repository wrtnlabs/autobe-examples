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

export async function test_api_user_profile_section_preference_update_display_order(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Section preference creation endpoint not provided in available APIs
  // Since we cannot create section preferences, we need to test with an existing one
  // This tests the update functionality assuming a preference exists
  // Use a valid UUID format for testing
  const testPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Test updating display order with minimum value
  const updateBodyMin: IDiscussionBoardSectionPreference.IUpdate = {
    display_order: 1,
  };
  const updatedMin =
    await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(
      userConnection,
      {
        preferenceId: testPreferenceId,
        body: updateBodyMin,
      },
    );
  typia.assert(updatedMin);
  TestValidator.equals(
    "updated preference should have valid UUID ID",
    typeof updatedMin.id,
    "string",
  );
  TestValidator.predicate(
    "displayOrder should be non-negative integer",
    updatedMin.displayOrder >= 0 && Number.isInteger(updatedMin.displayOrder),
  );
  // Test updating display order with higher value
  const higherValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  const updateBodyHigh: IDiscussionBoardSectionPreference.IUpdate = {
    display_order: higherValue,
  };
  const updatedHigh =
    await api.functional.discussionBoard.user.profile.sections.preferences.putByPreferenceid(
      userConnection,
      {
        preferenceId: testPreferenceId,
        body: updateBodyHigh,
      },
    );
  typia.assert(updatedHigh);
  TestValidator.equals(
    "displayOrder should be updated to new value",
    updatedHigh.displayOrder,
    higherValue,
  );
  TestValidator.predicate(
    "preference should have valid structure",
    typeof updatedHigh.notifyNewArticles === "boolean" &&
      typeof updatedHigh.notifyNewComments === "boolean" &&
      typeof updatedHigh.isHidden === "boolean" &&
      typeof updatedHigh.createdAt === "string" &&
      typeof updatedHigh.updatedAt === "string",
  );
  // Validate section and user summary structures
  TestValidator.predicate(
    "section should have valid structure",
    typeof updatedHigh.section.id === "string" &&
      typeof updatedHigh.section.name === "string" &&
      typeof updatedHigh.section.description === "string" &&
      typeof updatedHigh.section.status === "string" &&
      typeof updatedHigh.section.display_order === "number",
  );
  TestValidator.predicate(
    "user should have valid structure",
    typeof updatedHigh.user.id === "string" &&
      typeof updatedHigh.user.display_name === "string" &&
      typeof updatedHigh.user.created_at === "string",
  );
}
