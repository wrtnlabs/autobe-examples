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

export async function test_api_user_preferences_update_display_order_notification(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Note: Since there are no utility functions for creating section preferences,
  // and the current API only provides update functionality, this test focuses
  // on validating that the update operation works correctly with valid input data.
  // In a real scenario, section preferences would need to be created first.
  // Create a section preference update request
  const updateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: true,
    notify_new_comments: false,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  // Update user preferences
  const updatedPreference =
    await api.functional.discussionBoard.user.preferences.update(
      userConnection,
      { body: updateBody },
    );
  typia.assert(updatedPreference);
  // Validate the updated fields
  TestValidator.equals(
    "display order updated",
    updatedPreference.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "article notifications enabled",
    updatedPreference.notify_new_articles,
    true,
  );
  TestValidator.equals(
    "comment notifications disabled",
    updatedPreference.notify_new_comments,
    false,
  );
  // Validate that other fields remain with proper structure
  TestValidator.predicate(
    "user id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedPreference.user.id,
    ),
  );
  TestValidator.predicate(
    "created at timestamp is valid",
    !isNaN(new Date(updatedPreference.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    !isNaN(new Date(updatedPreference.updated_at).getTime()),
  );
  TestValidator.predicate(
    "is hidden has boolean value",
    typeof updatedPreference.is_hidden === "boolean",
  );
}
