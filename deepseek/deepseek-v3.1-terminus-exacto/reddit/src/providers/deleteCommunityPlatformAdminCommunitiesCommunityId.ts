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

export async function deleteCommunityPlatformAdminCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // Perform soft deletion using safe ISO string conversion
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
