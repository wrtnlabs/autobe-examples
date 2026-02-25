import { IDiscussionBoardSectionImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionImageCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionImage.ICreate;
    discussionBoardSections: IEntity;
  }) {
    return {
      id: v4(),
      filename: props.body.filename,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      width: props.body.width,
      height: props.body.height,
      image_type: props.body.image_type,
      storage_path: props.body.storage_path,
      alt_text: props.body.alt_text ?? null,
      section: { connect: { id: props.discussionBoardSections.id } },
    } satisfies Prisma.discussion_board_section_imagesCreateInput;
  }
}
