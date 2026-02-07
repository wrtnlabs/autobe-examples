import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdminVersionsVersionId(props: {
  superAdmin: SuperadminPayload;
  versionId: string;
}): Promise<IShoppingMallSystematicVersion> {
  const version =
    await MyGlobal.prisma.shopping_mall_systematic_versions.findUnique({
      where: { id: props.versionId },
    });
  if (!version) {
    throw new HttpException("System version not found", 404);
  }
  if (version.deleted_at !== null) {
    throw new HttpException("System version not found", 404);
  }
  return {
    id: version.id,
    component_name: version.component_name,
    version_number: version.version_number,
    migration_timestamp: toISOStringSafe(version.migration_timestamp),
    description: version.description,
    is_active: version.is_active,
    created_at: toISOStringSafe(version.created_at),
    updated_at: toISOStringSafe(version.updated_at),
    deleted_at: version.deleted_at
      ? toISOStringSafe(version.deleted_at)
      : undefined,
  };
}
