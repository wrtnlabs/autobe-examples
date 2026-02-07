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

export async function test_api_section_preferences_update_existing_preferences(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and section
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
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
  // 2. User setup - create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 3. Create initial preferences
  const initialPreferences =
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
  typia.assert(initialPreferences);
  // 4. Test partial update - update only display_order
  const partialUpdateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const partiallyUpdatedPreferences =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: partialUpdateBody,
      },
    );
  typia.assert(partiallyUpdatedPreferences);
  // Validate partial update preserved other fields
  TestValidator.equals(
    "display_order updated in partial update",
    partiallyUpdatedPreferences.display_order,
    partialUpdateBody.display_order,
  );
  TestValidator.equals(
    "notify_new_articles preserved in partial update",
    partiallyUpdatedPreferences.notify_new_articles,
    initialPreferences.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments preserved in partial update",
    partiallyUpdatedPreferences.notify_new_comments,
    initialPreferences.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden preserved in partial update",
    partiallyUpdatedPreferences.is_hidden,
    initialPreferences.is_hidden,
  );
  // 5. Test full update
  const fullUpdateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    notify_new_articles: false,
    notify_new_comments: true,
    is_hidden: true,
  } satisfies IDiscussionBoardSectionPreference.IUpdate;
  const fullyUpdatedPreferences =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      userConnection,
      {
        sectionId: section.id,
        body: fullUpdateBody,
      },
    );
  typia.assert(fullyUpdatedPreferences);
  // 6. Validate full update
  TestValidator.equals(
    "section ID unchanged",
    fullyUpdatedPreferences.section.id,
    initialPreferences.section.id,
  );
  TestValidator.equals(
    "user ID unchanged",
    fullyUpdatedPreferences.user.id,
    initialPreferences.user.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    fullyUpdatedPreferences.created_at,
    initialPreferences.created_at,
  );
  TestValidator.equals(
    "display_order updated",
    fullyUpdatedPreferences.display_order,
    fullUpdateBody.display_order,
  );
  TestValidator.equals(
    "notify_new_articles updated",
    fullyUpdatedPreferences.notify_new_articles,
    fullUpdateBody.notify_new_articles,
  );
  TestValidator.equals(
    "notify_new_comments updated",
    fullyUpdatedPreferences.notify_new_comments,
    fullUpdateBody.notify_new_comments,
  );
  TestValidator.equals(
    "is_hidden updated",
    fullyUpdatedPreferences.is_hidden,
    fullUpdateBody.is_hidden,
  );
  // 7. Validate timestamp update
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(fullyUpdatedPreferences.updated_at) >
      new Date(fullyUpdatedPreferences.created_at),
  );
  // 8. Test error case - user cannot update preferences for other users
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(anotherUser);
  // This should succeed as it creates new preferences for the new user
  const anotherUserPreferences =
    await api.functional.discussionBoard.user.sections.preferences.patchBySectionid(
      anotherUserConnection,
      {
        sectionId: section.id,
        body: {
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSectionPreference.IUpdate,
      },
    );
  typia.assert(anotherUserPreferences);
  // Verify different users have different preference records
  TestValidator.notEquals(
    "different users have different preference IDs",
    fullyUpdatedPreferences.id,
    anotherUserPreferences.id,
  );
  TestValidator.notEquals(
    "different users have different user IDs",
    fullyUpdatedPreferences.user.id,
    anotherUserPreferences.user.id,
  );
}
