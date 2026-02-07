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

export async function postShoppingMallAdminVersions(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicVersion.ICreate;
}): Promise<IShoppingMallSystematicVersion> {
  // IShoppingMallSystematicVersion.ICreate is an empty DTO with no fields
  // The database schema has component_name, version_number, etc., but the DTO doesn't
  // Therefore, we must use default/fixed values for all fields as per the specification
  // Create new version record with default values
  const created =
    await MyGlobal.prisma.shopping_mall_systematic_versions.create({
      data: {
        id: v4(),
        component_name: "", // Default empty string since DTO has no fields
        version_number: "0.0.0", // Default version since DTO has no fields
        migration_timestamp: new Date(),
        description: "", // Default empty string since DTO has no fields
        is_active: false, // Default inactive since DTO has no fields
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  // Return the created record with proper string conversions
  return {
    id: created.id,
    component_name: created.component_name,
    version_number: created.version_number,
    migration_timestamp: toISOStringSafe(created.migration_timestamp),
    description: created.description,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
