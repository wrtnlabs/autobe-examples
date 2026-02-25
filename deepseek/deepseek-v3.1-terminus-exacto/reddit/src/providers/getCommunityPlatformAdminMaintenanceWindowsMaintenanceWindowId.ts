import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformMaintenanceWindowTransformer } from "../transformers/CommunityPlatformMaintenanceWindowTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminMaintenanceWindowsMaintenanceWindowId(props: {
  admin: AdminPayload;
  maintenanceWindowId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMaintenanceWindow> {
  const maintenanceWindow =
    await MyGlobal.prisma.community_platform_maintenance_windows.findUniqueOrThrow(
      {
        where: {
          id: props.maintenanceWindowId,
          deleted_at: null,
        },
        ...CommunityPlatformMaintenanceWindowTransformer.select(),
      },
    );
  return await CommunityPlatformMaintenanceWindowTransformer.transform(
    maintenanceWindow,
  );
}
