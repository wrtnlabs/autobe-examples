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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.discussion_board_sections.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.sectionId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Section name must be unique", 400);
    }
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const section = await tx.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
    const now = new Date().toISOString() as unknown as string &
      tags.Format<"date-time">;
    const updateData: Prisma.discussion_board_sectionsUpdateInput = {
      updated_at: now,
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
    };
    await tx.discussion_board_sections.update({
      where: { id: props.sectionId },
      data: updateData,
    });
    await tx.discussion_board_section_admin_logs.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        action_type: "update",
        note: null,
        administrator: { connect: { id: props.administrator.id } },
        section: { connect: { id: props.sectionId } },
        created_at: now,
        updated_at: now,
      },
    });
    const refreshed = await tx.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
    return refreshed;
  });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
