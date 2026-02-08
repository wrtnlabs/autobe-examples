import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: Partial<{
    name: string;
    description: string | null;
  }>;
}): Promise<IDiscussionBoardSection> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section || section.deleted_at !== null) {
    throw new HttpException("Section not found", 404);
  }
  if (typeof props.body.name === "string" && props.body.name.trim() !== "") {
    const nameExists =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          AND: [
            { name: props.body.name },
            { id: { not: props.sectionId } },
            { deleted_at: null },
          ],
        },
      });
    if (nameExists) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  const updateData: Prisma.discussion_board_sectionsUpdateInput = {};
  if (typeof props.body.name === "string") {
    updateData.name = props.body.name;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    // Cast null to undefined to satisfy Prisma nullable string assignment
    updateData.description = { set: props.body.description ?? undefined };
  }
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: updateData,
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
