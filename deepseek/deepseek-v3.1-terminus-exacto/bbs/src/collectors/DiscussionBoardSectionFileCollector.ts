import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionFileCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionFile.ICreate;
    section: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      filename: props.body.filename,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      file_path: props.body.file_path,
      description: props.body.description ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relation
      section: { connect: { id: props.section.id } },
    } satisfies Prisma.discussion_board_section_filesCreateInput;
  }
}
