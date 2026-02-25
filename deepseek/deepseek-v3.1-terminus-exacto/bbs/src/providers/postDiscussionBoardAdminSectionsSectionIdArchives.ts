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
import { DiscussionBoardSectionArchiveCollector } from "../collectors/DiscussionBoardSectionArchiveCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionArchiveTransformer } from "../transformers/DiscussionBoardSectionArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdArchives(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionArchive.ICreate;
}): Promise<IDiscussionBoardSectionArchive> {
  // Check if section exists and is not already archived
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // Check if section is already archived
  const existingArchive =
    await MyGlobal.prisma.discussion_board_section_archives.findUnique({
      where: { discussion_board_section_id: props.sectionId },
    });
  if (existingArchive) {
    throw new HttpException("Section is already archived", 400);
  }
  // Use transactional approach to update section status and create archive record
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update section status to 'archived'
    await tx.discussion_board_sections.update({
      where: { id: props.sectionId },
      data: { status: "archived" },
    });
    // Create archive record using collector
    const archive = await tx.discussion_board_section_archives.create({
      data: await DiscussionBoardSectionArchiveCollector.collect({
        body: props.body,
        discussionBoardSections: { id: props.sectionId },
        discussionBoardAdmins: { id: props.admin.id },
        discussionBoardAdminSessions: { id: props.admin.session_id },
      }),
      ...DiscussionBoardSectionArchiveTransformer.select(),
    });
    return archive;
  });
  // Transform and return the archive record
  return await DiscussionBoardSectionArchiveTransformer.transform(result);
}
