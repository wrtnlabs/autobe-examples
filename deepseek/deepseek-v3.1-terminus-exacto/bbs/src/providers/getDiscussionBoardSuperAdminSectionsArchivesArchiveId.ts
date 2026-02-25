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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionArchiveTransformer } from "../transformers/DiscussionBoardSectionArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSectionsArchivesArchiveId(props: {
  superAdmin: SuperAdminPayload;
  archiveId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSectionArchive> {
  const archive =
    await MyGlobal.prisma.discussion_board_section_archives.findUniqueOrThrow({
      where: { id: props.archiveId },
      ...DiscussionBoardSectionArchiveTransformer.select(),
    });
  return await DiscussionBoardSectionArchiveTransformer.transform(archive);
}
