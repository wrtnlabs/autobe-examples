import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdministratorSectionsSectionId(props: {
  superAdministrator: SuperadministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  const { superAdministrator, sectionId, body } = props;
  // Verify section existence
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: sectionId },
  });
  // Check for unique name if name is provided in update
  if (body.name !== undefined) {
    const duplicate = await MyGlobal.prisma.discussion_board_sections.findFirst(
      {
        where: {
          name: body.name,
          id: { not: sectionId },
        },
      },
    );
    if (duplicate) {
      throw new HttpException(
        `Section name "${body.name}" already exists`,
        400,
      );
    }
  }
  // Use transaction for atomicity
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date().toISOString() as string & tags.Format<"date-time">;
    await tx.discussion_board_sections.update({
      where: { id: sectionId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        updated_at: now,
      },
    });
    await tx.discussion_board_section_admin_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        action_type: "update",
        administrator_id: superAdministrator.id,
        section_id: sectionId,
        note: null,
        created_at: now,
        updated_at: now,
      },
    });
    const section = await tx.discussion_board_sections.findUniqueOrThrow({
      where: { id: sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
    return section;
  });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
