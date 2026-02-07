import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionFileTransformer } from "../transformers/DiscussionBoardSectionFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionIdFilesFileId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IUpdate;
}): Promise<IDiscussionBoardSectionFile> {
  // Verify section exists
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) throw new HttpException("Section not found", 404);
  // Verify file exists and belongs to section
  const file = await MyGlobal.prisma.discussion_board_section_files.findUnique({
    where: { id: props.fileId },
  });
  if (!file) throw new HttpException("File not found", 404);
  if (file.discussion_board_section_id !== props.sectionId) {
    throw new HttpException(
      "File does not belong to the specified section",
      400,
    );
  }
  // Prepare update data with proper typing
  const updateData: Prisma.discussion_board_section_filesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.filename !== undefined)
    updateData.filename = props.body.filename;
  if (props.body.file_type !== undefined)
    updateData.file_type = props.body.file_type;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  // Update file metadata
  const updatedFile =
    await MyGlobal.prisma.discussion_board_section_files.update({
      where: { id: props.fileId },
      data: updateData,
      ...DiscussionBoardSectionFileTransformer.select(),
    });
  return await DiscussionBoardSectionFileTransformer.transform(updatedFile);
}
