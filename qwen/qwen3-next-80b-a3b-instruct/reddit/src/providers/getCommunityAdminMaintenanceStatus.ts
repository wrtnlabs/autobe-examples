import { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
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

export async function getCommunityAdminMaintenanceStatus(props: {
  admin: AdminPayload;
}): Promise<ICommunityServiceStatus> {
  try {
    const status = await MyGlobal.prisma.community_service_statuses.findFirst({
      orderBy: {
        last_checked: "desc",
      },
      take: 1,
    });
    if (!status) {
      throw new HttpException("No maintenance status recorded", 503);
    }
    return {
      service_name: status.service_name,
      status: status.status,
      last_checked: toISOStringSafe(status.last_checked),
      description: status.description,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpException("Database connection down", 503);
    }
    if (
      error instanceof Error &&
      (error.message.includes("connect") ||
        error.message.includes("connection"))
    ) {
      throw new HttpException("Database connection down", 503);
    }
    throw error;
  }
}
