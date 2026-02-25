import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdministratorCacheConfigurationsConfigId(props: {
  administrator: AdministratorPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the administrator is enrolled and active (implicit via authorization)
  // Check if the cache configuration exists and is not already deleted
  const existingConfig =
    await MyGlobal.prisma.ecommerce_cache_configurations.findFirst({
      where: {
        id: props.configId,
        deleted_at: null,
      },
    });
  if (existingConfig === null) {
    throw new HttpException(
      "Cache configuration not found or already deleted",
      404,
    );
  }
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.ecommerce_cache_configurations.update({
    where: { id: props.configId },
    data: {
      deleted_at: new Date().toISOString(),
    },
  });
}
