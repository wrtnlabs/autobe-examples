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
 * Test partial updates to section preferences where only specific fields are modified.
 * Verify that unspecified fields retain their previous values while only the provided fields are updated.
 * Test combinations like updating only display order, only notification settings, or only visibility controls
 * to ensure the upsert functionality works correctly for partial updates.
 */
export async function test_api_section_preferences_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123456",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. User setup
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123456",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create initial preference with full set of values
  const initialPreference =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
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
  typia.assert(initialPreference);
  // 4. Test partial update: update only display_order
  const newDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const updatedDisplayOrder =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: {
          display_order: newDisplayOrder,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedDisplayOrder);
  // Verify only display_order changed
  TestValidator.equals(
    "display_order should be updated",
    updatedDisplayOrder.display_order,
    newDisplayOrder,
  );
  TestValidator.equals(
    "notify_new_articles should remain unchanged",
    updatedDisplayOrder.notify_new_articles,
    initialPreference.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    updatedDisplayOrder.notify_new_comments,
    initialPreference.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden should remain unchanged",
    updatedDisplayOrder.is_hidden,
    initialPreference.is_hidden,
  );
  // 5. Test partial update: update only notify_new_articles
  const updatedNotifyArticles =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: {
          notify_new_articles: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedNotifyArticles);
  // Verify only notify_new_articles changed
  TestValidator.equals(
    "display_order should remain unchanged",
    updatedNotifyArticles.display_order,
    updatedDisplayOrder.display_order,
  );
  TestValidator.equals(
    "notify_new_articles should be updated",
    updatedNotifyArticles.notify_new_articles,
    false,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    updatedNotifyArticles.notify_new_comments,
    updatedDisplayOrder.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden should remain unchanged",
    updatedNotifyArticles.is_hidden,
    updatedDisplayOrder.is_hidden,
  );
  // 6. Test partial update: update only notify_new_comments
  const updatedNotifyComments =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: {
          notify_new_comments: true,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedNotifyComments);
  // Verify only notify_new_comments changed
  TestValidator.equals(
    "display_order should remain unchanged",
    updatedNotifyComments.display_order,
    updatedNotifyArticles.display_order,
  );
  TestValidator.equals(
    "notify_new_articles should remain unchanged",
    updatedNotifyComments.notify_new_articles,
    updatedNotifyArticles.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments should be updated",
    updatedNotifyComments.notify_new_comments,
    true,
  );
  TestValidator.equals(
    "is_hidden should remain unchanged",
    updatedNotifyComments.is_hidden,
    updatedNotifyArticles.is_hidden,
  );
  // 7. Test partial update: update only is_hidden
  const updatedHidden =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: {
          is_hidden: true,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(updatedHidden);
  // Verify only is_hidden changed
  TestValidator.equals(
    "display_order should remain unchanged",
    updatedHidden.display_order,
    updatedNotifyComments.display_order,
  );
  TestValidator.equals(
    "notify_new_articles should remain unchanged",
    updatedHidden.notify_new_articles,
    updatedNotifyComments.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    updatedHidden.notify_new_comments,
    updatedNotifyComments.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden should be updated",
    updatedHidden.is_hidden,
    true,
  );
  // 8. Test combination update: update multiple fields together
  const newCombinationDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const combinationUpdate =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: {
          display_order: newCombinationDisplayOrder,
          notify_new_articles: true,
          is_hidden: false,
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(combinationUpdate);
  // Verify combination update worked correctly
  TestValidator.equals(
    "display_order should be updated",
    combinationUpdate.display_order,
    newCombinationDisplayOrder,
  );
  TestValidator.equals(
    "notify_new_articles should be updated",
    combinationUpdate.notify_new_articles,
    true,
  );
  TestValidator.equals(
    "notify_new_comments should remain unchanged",
    combinationUpdate.notify_new_comments,
    updatedHidden.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden should be updated",
    combinationUpdate.is_hidden,
    false,
  );
}
