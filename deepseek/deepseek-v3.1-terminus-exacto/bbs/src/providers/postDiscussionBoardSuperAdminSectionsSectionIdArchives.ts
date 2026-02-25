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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSectionArchiveTransformer } from "../transformers/DiscussionBoardSectionArchiveTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardSuperAdminSectionsSectionIdArchives(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionArchive.ICreate;
}): Promise<IDiscussionBoardSectionArchive> {
  // Validate section exists and is not deleted
  const section =
    await MyGlobal.prisma.discussion_board_sections.findFirstOrThrow({
      where: {
        id: props.sectionId,
        deleted_at: null,
      },
      select: { id: true, status: true, deleted_at: true },
    });
  // Check if section is already archived using status field
  if (section.status === "archived") {
    throw new HttpException("Section already archived", 400);
  }
  // Check for existing archive record to prevent duplicates
  const existingArchive =
    await MyGlobal.prisma.discussion_board_section_archives.findUnique({
      where: { discussion_board_section_id: props.sectionId },
    });
  if (existingArchive) {
    throw new HttpException(
      "Archive record already exists for this section",
      400,
    );
  }
  // Create archive record and update section status in transaction
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Use DiscussionBoardSectionArchiveCollector for data creation
    const archive = await tx.discussion_board_section_archives.create({
      data: await DiscussionBoardSectionArchiveCollector.collect({
        body: props.body,
        discussionBoardSections: { id: props.sectionId },
        discussionBoardAdmins: { id: props.superAdmin.id },
        discussionBoardAdminSessions: { id: props.superAdmin.session_id },
      }),
      ...DiscussionBoardSectionArchiveTransformer.select(),
    });
    // Update section to archived status
    await tx.discussion_board_sections.update({
      where: { id: props.sectionId },
      data: {
        status: "archived",
        updated_at: new Date(),
      },
    });
    return archive;
  });
  return await DiscussionBoardSectionArchiveTransformer.transform(result);
}
