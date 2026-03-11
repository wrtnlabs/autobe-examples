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

export async function deleteDiscussionBoardSuperAdminAttachmentCategoryMappingsMappingId(props: {
  superAdmin: SuperadminPayload;
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify mapping exists first
  await MyGlobal.prisma.discussion_board_attachment_category_mappings.findUniqueOrThrow(
    {
      where: { id: props.mappingId },
    },
  );
  // Delete the mapping
  await MyGlobal.prisma.discussion_board_attachment_category_mappings.delete({
    where: { id: props.mappingId },
  });
  // No return value needed (void)
}
