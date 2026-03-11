import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardAdminSystemMetadataMetadataId(props: {
  admin: AdminPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the metadata record exists
  await MyGlobal.prisma.discussion_board_system_metadata.findUniqueOrThrow({
    where: { id: props.metadataId },
  });
  // Perform hard deletion
  await MyGlobal.prisma.discussion_board_system_metadata.delete({
    where: { id: props.metadataId },
  });
  // Note: Audit logging would be implemented here if audit log system exists
  // For now, just complete the deletion as specified
}
