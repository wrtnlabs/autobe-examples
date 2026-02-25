import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  const { sectionId, body } = props;
  // Check if section exists and get current name for uniqueness validation
  const currentSection =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: sectionId },
      select: { id: true, name: true },
    });
  // Validate name uniqueness if name is being changed
  if (body.name !== undefined && body.name !== currentSection.name) {
    const existing = await MyGlobal.prisma.discussion_board_sections.findUnique(
      {
        where: { name: body.name },
      },
    );
    if (existing !== null && existing.id !== sectionId) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  // Update section
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: sectionId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
    },
  });
  // Convert to DTO with proper datetime formatting
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? undefined,
    created_at: updated.created_at.toISOString() as string &
      tags.Format<"date-time">,
  };
}
