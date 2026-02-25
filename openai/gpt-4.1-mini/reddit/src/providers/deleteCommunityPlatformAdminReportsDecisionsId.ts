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

export async function deleteCommunityPlatformAdminReportsDecisionsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_reports_decisions.findUniqueOrThrow({
    where: { id: props.id },
  });
  await MyGlobal.prisma.community_platform_reports_decisions.delete({
    where: { id: props.id },
  });
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.community_platform_moderation_logs.create({
    data: {
      id: v4(),
      moderator_id: props.admin.id,
      description: "Deleted report decision by admin",
      created_at: createdAt,
    },
  });
}
