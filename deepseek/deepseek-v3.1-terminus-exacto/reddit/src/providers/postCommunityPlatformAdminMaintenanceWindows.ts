import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMaintenanceWindowCollector } from "../collectors/CommunityPlatformMaintenanceWindowCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMaintenanceWindowTransformer } from "../transformers/CommunityPlatformMaintenanceWindowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminMaintenanceWindows(props: {
  admin: AdminPayload;
  body: ICommunityPlatformMaintenanceWindow.ICreate;
}): Promise<ICommunityPlatformMaintenanceWindow> {
  // Business validation: scheduled_end must be after scheduled_start
  if (props.body.scheduled_end <= props.body.scheduled_start) {
    throw new HttpException("Scheduled end must be after scheduled start", 400);
  }
  const created =
    await MyGlobal.prisma.community_platform_maintenance_windows.create({
      data: await CommunityPlatformMaintenanceWindowCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformMaintenanceWindowTransformer.select(),
    });
  return await CommunityPlatformMaintenanceWindowTransformer.transform(created);
}
