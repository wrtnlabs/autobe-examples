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

export async function deleteEcommerceMallAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const configuration =
    await MyGlobal.prisma.ecommerce_mall_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configurationId },
      },
    );
  await MyGlobal.prisma.ecommerce_mall_system_configurations.update({
    where: { id: props.configurationId },
    data: { deleted_at: new Date() },
  });
}
