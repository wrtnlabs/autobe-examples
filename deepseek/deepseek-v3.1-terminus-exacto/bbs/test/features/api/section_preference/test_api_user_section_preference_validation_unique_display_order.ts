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

export async function test_api_user_section_preference_validation_unique_display_order(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections for testing using generation function
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      },
    },
  );
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<11> & tags.Maximum<20>
        >(),
      },
    },
  );
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create first preference successfully
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const preference1 =
    await generate_random_discussion_board_user_profile_sections_preferences_create(
      userConnection,
      {
        body: {
          discussion_board_section_id: section1.id,
          display_order: displayOrder,
          notify_new_articles: true,
          notify_new_comments: false,
          is_hidden: false,
        },
      },
    );
  TestValidator.equals(
    "first preference should have correct display order",
    preference1.displayOrder,
    displayOrder,
  );
  // Attempt to create second preference with same display order - expecting error
  await TestValidator.error(
    "should reject duplicate display order",
    async () => {
      await generate_random_discussion_board_user_profile_sections_preferences_create(
        userConnection,
        {
          body: {
            discussion_board_section_id: section2.id,
            display_order: displayOrder,
            notify_new_articles: false,
            notify_new_comments: true,
            is_hidden: false,
          },
        },
      );
    },
  );
  // Create preference with different display order - should succeed
  const differentDisplayOrder = displayOrder + 1;
  const preference2 =
    await generate_random_discussion_board_user_profile_sections_preferences_create(
      userConnection,
      {
        body: {
          discussion_board_section_id: section2.id,
          display_order: differentDisplayOrder,
          notify_new_articles: false,
          notify_new_comments: true,
          is_hidden: false,
        },
      },
    );
  TestValidator.equals(
    "second preference should have different display order",
    preference2.displayOrder,
    differentDisplayOrder,
  );
}
