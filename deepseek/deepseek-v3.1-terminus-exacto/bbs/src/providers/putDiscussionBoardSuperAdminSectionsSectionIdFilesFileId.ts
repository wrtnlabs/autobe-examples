import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionFileTransformer } from "../transformers/DiscussionBoardSectionFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdFilesFileId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IUpdate;
}): Promise<IDiscussionBoardSectionFile> {
  // First verify the section exists
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
  });
  // Verify file exists and belongs to specified section
  const existingFile =
    await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
      where: {
        id: props.fileId,
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
    });
  // Update the file description
  const updatedFile =
    await MyGlobal.prisma.discussion_board_section_files.update({
      where: { id: props.fileId },
      data: {
        description:
          props.body.description !== undefined
            ? props.body.description
            : existingFile.description,
        updated_at: new Date(),
      },
      ...DiscussionBoardSectionFileTransformer.select(),
    });
  return await DiscussionBoardSectionFileTransformer.transform(updatedFile);
}
