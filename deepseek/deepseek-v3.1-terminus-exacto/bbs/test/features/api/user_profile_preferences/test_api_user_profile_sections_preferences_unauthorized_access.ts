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
import { generate_random_discussion_board_user_profile_sections_preferences_create } from "../../../generate/generate_random_discussion_board_user_profile_sections_preferences_create";
import { prepare_random_discussion_board_section_preference } from "../../../prepare/prepare_random_discussion_board_section_preference";

export async function test_api_user_profile_sections_preferences_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first user and their section preference
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(firstUser);
  // Generate a section preference for the first user
  const preferenceCreated =
    await generate_random_discussion_board_user_profile_sections_preferences_create(
      firstUserConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          notify_new_articles: true,
          notify_new_comments: false,
          is_hidden: false,
        },
      },
    );
  typia.assert(preferenceCreated);
  // Create second user (different account)
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(secondUser);
  // Attempt unauthorized access - second user tries to retrieve first user's preference
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.discussionBoard.user.profile.sections.preferences.at(
      secondUserConnection,
      {
        preferenceId: preferenceCreated.id,
      },
    );
  });
}
