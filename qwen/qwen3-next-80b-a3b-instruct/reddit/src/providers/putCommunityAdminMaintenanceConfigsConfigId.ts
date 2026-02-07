import { ICommunityMaintenanceConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMaintenanceConfig";
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

export async function putCommunityAdminMaintenanceConfigsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
  body: ICommunityMaintenanceConfig;
}): Promise<ICommunityMaintenanceConfig> {
  const existing =
    await MyGlobal.prisma.community_maintenance_configs.findUnique({
      where: { id: props.configId, deleted_at: null },
    });
  if (!existing)
    throw new HttpException("Maintenance configuration not found", 404);
  const updated = await MyGlobal.prisma.community_maintenance_configs.update({
    where: { id: props.configId },
    data: {},
  });
  return typia.random<ICommunityMaintenanceConfig>();
}
