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

/**
 * Test partial update of user section preferences focusing on visibility controls.
 *
 * This test verifies that partial updates to section preferences work correctly,
 * specifically testing the is_hidden field toggle functionality while preserving
 * other preference values unchanged.
 */
export async function test_api_user_section_preferences_partial_update_hidden_status(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Use a valid section ID that exists in the test environment
  // Since we don't have section creation API in the provided functions,
  // we'll use a realistic UUID format that the test environment might accept
  const sectionId = "00000000-0000-0000-0000-000000000001" satisfies string &
    tags.Format<"uuid">;
  // Create initial section preference with is_hidden: false
  const initialPreference =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: sectionId,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          notify_new_articles: typia.random<boolean>(),
          notify_new_comments: typia.random<boolean>(),
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(initialPreference);
  // Store original values for comparison
  const originalDisplayOrder = initialPreference.display_order;
  const originalNotifyArticles = initialPreference.notify_new_articles;
  const originalNotifyComments = initialPreference.notify_new_comments;
  // Partial update: change only is_hidden from false to true
  const updatedPreference =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: initialPreference.section.id,
        body: {
          is_hidden: true,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);
  // Validate that only is_hidden changed
  TestValidator.equals(
    "is_hidden should be true",
    updatedPreference.is_hidden,
    true,
  );
  TestValidator.equals(
    "display_order should remain unchanged",
    updatedPreference.display_order,
    originalDisplayOrder,
  );
  TestValidator.equals(
    "notify_new_articles should remain unchanged",
    updatedPreference.notify_new_articles,
    originalNotifyArticles,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    updatedPreference.notify_new_comments,
    originalNotifyComments,
  );
  // Reverse update: change is_hidden back to false
  const finalPreference =
    await api.functional.discussionBoard.user.sections.preferences.putBySectionid(
      userConnection,
      {
        sectionId: initialPreference.section.id,
        body: {
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(finalPreference);
  // Validate reverse update
  TestValidator.equals(
    "is_hidden should be false again",
    finalPreference.is_hidden,
    false,
  );
  TestValidator.equals(
    "display_order should remain unchanged",
    finalPreference.display_order,
    originalDisplayOrder,
  );
  TestValidator.equals(
    "notify_new_articles should remain unchanged",
    finalPreference.notify_new_articles,
    originalNotifyArticles,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    finalPreference.notify_new_comments,
    originalNotifyComments,
  );
}
