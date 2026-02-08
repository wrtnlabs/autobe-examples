import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformModeratorDeletedContentsDeletedContentId(props: {
  moderator: ModeratorPayload;
  deletedContentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check for existence of deleted content record
  const deletedContent =
    await MyGlobal.prisma.community_platform_deleted_contents.findUnique({
      where: { id: props.deletedContentId },
    });
  if (!deletedContent) {
    throw new HttpException("Deleted content not found", 404);
  }
  // Perform deletion within a transaction
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.community_platform_deleted_contents.delete({
      where: { id: props.deletedContentId },
    });
  });
}
