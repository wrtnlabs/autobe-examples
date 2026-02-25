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

export async function getDiscussionBoardSuperAdminSectionsSectionIdFilesFileId(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  fileId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionFile> {
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
