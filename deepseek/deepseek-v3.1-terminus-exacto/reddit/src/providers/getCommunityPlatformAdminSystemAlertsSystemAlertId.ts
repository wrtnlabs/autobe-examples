import { ICommunityPlatformSystemAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemAlert";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemAlertTransformer } from "../transformers/CommunityPlatformSystemAlertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminSystemAlertsSystemAlertId(props: {
  admin: AdminPayload;
  systemAlertId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSystemAlert> {
  try {
    const alert =
      await MyGlobal.prisma.community_platform_system_alerts.findUniqueOrThrow({
        where: {
          id: props.systemAlertId,
        } satisfies Prisma.community_platform_system_alertsWhereUniqueInput,
        ...CommunityPlatformSystemAlertTransformer.select(),
      });
    return await CommunityPlatformSystemAlertTransformer.transform(alert);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      // Record not found
      throw new HttpException(
        `System alert with ID ${props.systemAlertId} not found`,
        404,
      );
    }
    throw error;
  }
}
