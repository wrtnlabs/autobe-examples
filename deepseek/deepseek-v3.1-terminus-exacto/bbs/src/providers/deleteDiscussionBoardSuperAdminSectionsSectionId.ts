import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSection> {
  // Use transaction for atomic find-and-update operation
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if section exists and is not already deleted
    const existingSection = await tx.discussion_board_sections.findUnique({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
    if (!existingSection) {
      throw new HttpException("Section not found", 404);
    }
    if (existingSection.deleted_at !== null) {
      throw new HttpException("Section already deleted", 409);
    }
    // Perform soft deletion by setting deleted_at timestamp
    const updatedSection = await tx.discussion_board_sections.update({
      where: { id: props.sectionId },
      data: {
        deleted_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        last_modified_by_admin_id: props.superAdmin.id,
      },
      ...DiscussionBoardSectionTransformer.select(),
    });
    return updatedSection;
  });
  return await DiscussionBoardSectionTransformer.transform(result);
}
