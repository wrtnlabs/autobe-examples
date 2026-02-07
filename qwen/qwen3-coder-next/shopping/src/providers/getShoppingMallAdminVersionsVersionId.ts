import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicVersion";
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

export async function getShoppingMallAdminVersionsVersionId(props: {
  admin: AdminPayload;
  versionId: string;
}): Promise<IShoppingMallSystematicVersion> {
  const version =
    await MyGlobal.prisma.shopping_mall_systematic_versions.findUnique({
      where: { id: props.versionId },
    });
  if (!version) {
    throw new HttpException("Version not found", 404);
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
    deleted_at: version.deleted_at ? toISOStringSafe(version.deleted_at) : null,
  };
}
