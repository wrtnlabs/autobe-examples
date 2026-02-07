import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionArchiveTransformer } from "../transformers/DiscussionBoardSectionArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSectionsSectionIdArchivesArchiveId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  archiveId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionArchive> {
  const archive =
    await MyGlobal.prisma.discussion_board_section_archives.findFirst({
      where: {
        AND: [
          { id: props.archiveId },
          { discussion_board_section_id: props.sectionId },
        ],
      },
      ...DiscussionBoardSectionArchiveTransformer.select(),
    });
  if (!archive) {
    throw new HttpException("Section archive not found", 404);
  }
  return await DiscussionBoardSectionArchiveTransformer.transform(archive);
}
