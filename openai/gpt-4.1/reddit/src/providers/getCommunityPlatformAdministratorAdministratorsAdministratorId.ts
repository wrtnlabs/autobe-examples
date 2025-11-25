import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function getCommunityPlatformAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformAdministrator> {
  const admin =
    await MyGlobal.prisma.community_platform_administrators.findUnique({
      where: { id: props.administratorId },
    });

  if (!admin) {
    throw new HttpException("Administrator not found", 404);
  }

  return {
    id: admin.id,
    email: admin.email,
    status: admin.status,
    business_status:
      typeof admin.business_status === "undefined"
        ? undefined
        : admin.business_status === null
          ? null
          : admin.business_status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      typeof admin.deleted_at === "undefined"
        ? undefined
        : admin.deleted_at === null
          ? null
          : toISOStringSafe(admin.deleted_at),
  };
}
