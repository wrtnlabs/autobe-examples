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

export async function getDiscussionBoardAdminSectionsSectionIdFilesFileId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionFile> {
  // Verify the section exists and is not deleted
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId, deleted_at: null },
    select: { id: true },
  });
  // Retrieve the specific file with proper relationship validation
  const file =
    await MyGlobal.prisma.discussion_board_section_files.findUniqueOrThrow({
      where: {
        id: props.fileId,
        discussion_board_section_id: props.sectionId,
        deleted_at: null,
      },
      ...DiscussionBoardSectionFileTransformer.select(),
    });
  return await DiscussionBoardSectionFileTransformer.transform(file);
}
