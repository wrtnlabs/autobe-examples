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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSection> {
  // Check if section exists and is not already deleted
  const existingSection =
    await MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: props.sectionId },
      ...DiscussionBoardSectionTransformer.select(),
    });
  if (!existingSection) {
    throw new HttpException("Section not found", 404);
  }
  if (existingSection.deleted_at !== null) {
    throw new HttpException("Section already deleted", 400);
  }
  const currentTimestamp = toISOStringSafe(new Date());
  // Perform soft deletion by setting deleted_at timestamp
  const deletedSection = await MyGlobal.prisma.discussion_board_sections.update(
    {
      where: { id: props.sectionId },
      data: {
        deleted_at: currentTimestamp,
        last_modified_by_admin_id: props.admin.id,
        updated_at: currentTimestamp,
      },
      ...DiscussionBoardSectionTransformer.select(),
    },
  );
  return await DiscussionBoardSectionTransformer.transform(deletedSection);
}
