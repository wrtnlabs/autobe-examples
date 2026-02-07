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

export async function test_api_user_preferences_partial_update_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
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
  // Since there's no endpoint to create initial preferences, we'll test with
  // default preference values by performing a full update first
  const initialPreferences =
    await api.functional.discussionBoard.user.preferences.update(
      userConnection,
      {
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          notify_new_articles: true,
          notify_new_comments: false,
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(initialPreferences);
  // Store original notification settings for comparison
  const originalNotifyArticles = initialPreferences.notify_new_articles;
  const originalNotifyComments = initialPreferences.notify_new_comments;
  const originalIsHidden = initialPreferences.is_hidden;
  // Perform partial update - modify only display_order
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updatedPreferences =
    await api.functional.discussionBoard.user.preferences.update(
      userConnection,
      {
        body: {
          display_order: newDisplayOrder,
          // Intentionally omit notification settings to test preservation
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedPreferences);
  // Validate that unchanged fields are preserved
  TestValidator.equals(
    "notify_new_articles should be preserved",
    updatedPreferences.notify_new_articles,
    originalNotifyArticles,
  );
  TestValidator.equals(
    "notify_new_comments should be preserved",
    updatedPreferences.notify_new_comments,
    originalNotifyComments,
  );
  TestValidator.equals(
    "is_hidden should be preserved",
    updatedPreferences.is_hidden,
    originalIsHidden,
  );
  // Validate that display_order is updated
  TestValidator.equals(
    "display_order should be updated",
    updatedPreferences.display_order,
    newDisplayOrder,
  );
  // Validate that other fields remain unchanged
  TestValidator.equals(
    "section should remain unchanged",
    updatedPreferences.section,
    initialPreferences.section,
  );
  TestValidator.equals(
    "user should remain unchanged",
    updatedPreferences.user,
    initialPreferences.user,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedPreferences.id,
    initialPreferences.id,
  );
  // Validate timestamps - created_at should remain, updated_at should change
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedPreferences.created_at,
    initialPreferences.created_at,
  );
  TestValidator.notEquals(
    "updated_at should be different after update",
    updatedPreferences.updated_at,
    initialPreferences.updated_at,
  );
}
