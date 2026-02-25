import { IDiscussionBoardSectionFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionFileTransformer } from "../transformers/DiscussionBoardSectionFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdminSectionsSectionIdFilesFileId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionFile.IUpdate;
}): Promise<IDiscussionBoardSectionFile> {
  // Verify file exists and belongs to the specified section, and is not deleted
  await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      discussion_board_section_id: props.sectionId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Update the file description and timestamp
  await MyGlobal.prisma.discussion_board_section_files.update({
    where: { id: props.fileId },
    data: {
      description:
        props.body.description === null
          ? null
          : (props.body.description ?? undefined),
      updated_at: new Date(),
    },
  });
  // Retrieve the updated file with full data using transformer's select
  const updatedFile =
    await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
      where: { id: props.fileId },
      ...DiscussionBoardSectionFileTransformer.select(),
    });
  // Transform and return using the transformer
  return DiscussionBoardSectionFileTransformer.transform(updatedFile);
}
