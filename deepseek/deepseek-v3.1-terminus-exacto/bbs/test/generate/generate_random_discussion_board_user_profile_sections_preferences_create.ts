import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionPreference";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_preference } from "../prepare/prepare_random_discussion_board_section_preference";

export async function generate_random_discussion_board_user_profile_sections_preferences_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionPreference.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSectionPreference> {
  const prepared: IDiscussionBoardSectionPreference.ICreate =
    prepare_random_discussion_board_section_preference(props.body);
  const result: IDiscussionBoardSectionPreference =
    await api.functional.discussionBoard.user.profile.sections.preferences.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
