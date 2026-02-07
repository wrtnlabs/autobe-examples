import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_section_image } from "../prepare/prepare_random_discussion_board_section_image";

export async function generate_random_discussion_board_super_admin_sections_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSectionImage.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSectionImage> {
  const prepared: IDiscussionBoardSectionImage.ICreate =
    prepare_random_discussion_board_section_image(props.body);
  const result: IDiscussionBoardSectionImage =
    await api.functional.discussionBoard.superAdmin.sections.images.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
