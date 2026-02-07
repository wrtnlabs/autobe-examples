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

export async function putShoppingMallAdminVersionsVersionId(props: {
  admin: AdminPayload;
  versionId: string & tags.Format<"uuid">;
  body: IShoppingMallSystematicVersion.IUpdate;
}): Promise<IShoppingMallSystematicVersion> {
  const version =
    await MyGlobal.prisma.shopping_mall_systematic_versions.findUnique({
      where: { id: props.versionId },
    });
  if (!version) throw new HttpException("Systematic version not found", 404);
  const updated =
    await MyGlobal.prisma.shopping_mall_systematic_versions.update({
      where: { id: props.versionId },
      data: props.body as any,
    });
  return {
    id: updated.id,
    component_name: updated.component_name,
    version_number: updated.version_number,
    migration_timestamp: toISOStringSafe(updated.migration_timestamp),
    description: updated.description,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
