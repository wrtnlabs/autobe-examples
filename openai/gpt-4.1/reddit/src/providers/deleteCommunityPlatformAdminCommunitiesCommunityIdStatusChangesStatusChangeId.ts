import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdStatusChangesStatusChangeId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  statusChangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization enforced by controller layer (AdminPayload)

  // Check existence and match on id and community_id
  const record =
    await MyGlobal.prisma.community_platform_community_status_changes.findUnique(
      {
        where: { id: props.statusChangeId },
      },
    );
  if (!record || record.community_id !== props.communityId) {
    throw new HttpException(
      "Status change entry not found for this community",
      404,
    );
  }

  await MyGlobal.prisma.community_platform_community_status_changes.delete({
    where: { id: props.statusChangeId },
  });
  // No return - success
}
