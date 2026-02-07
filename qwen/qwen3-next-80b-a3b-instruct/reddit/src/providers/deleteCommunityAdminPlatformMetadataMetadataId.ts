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

export async function deleteCommunityAdminPlatformMetadataMetadataId(props: {
  admin: AdminPayload;
  metadataId: string & tags.Format<"uuid">;
}): Promise<void> {
  const updated = await MyGlobal.prisma.community_platform_metadata.update({
    where: { id: props.metadataId, deleted_at: null },
    data: {
      deleted_at: "2026-02-06T14:11:57.483Z" as string &
        tags.Format<"date-time">,
    },
  });
  if (!updated) {
    throw new HttpException(
      "Platform metadata not found or already deleted",
      404,
    );
  }
}
