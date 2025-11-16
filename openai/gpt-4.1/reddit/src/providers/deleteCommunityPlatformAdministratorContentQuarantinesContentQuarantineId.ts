import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorContentQuarantinesContentQuarantineId(props: {
  administrator: AdministratorPayload;
  contentQuarantineId: string & tags.Format<"uuid">;
}): Promise<void> {
  const quarantine =
    await MyGlobal.prisma.community_platform_content_quarantines.findUnique({
      where: { id: props.contentQuarantineId },
    });

  if (!quarantine) {
    throw new HttpException("Content quarantine not found", 404);
  }

  await MyGlobal.prisma.community_platform_content_quarantines.delete({
    where: { id: props.contentQuarantineId },
  });
  // No return value as the operation is void
}
