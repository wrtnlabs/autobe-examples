import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
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

export async function getEcommerceAdministratorAdminUserBansAdminUserBanId(props: {
  administrator: AdministratorPayload;
  adminUserBanId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMetadataRegistryRelationshipOfVariantConfig> {
  // First verify the administrator exists and is active
  await MyGlobal.prisma.ecommerce_administrators.findFirstOrThrow({
    where: {
      id: props.administrator.id,
      deleted_at: null,
    },
  });
  // Query the admin user ban record
  const adminUserBan =
    await MyGlobal.prisma.ecommerce_admin_user_bans.findFirstOrThrow({
      where: {
        id: props.adminUserBanId,
        deleted_at: null,
      },
      include: {
        administrator: {
          select: { id: true, email: true, created_at: true },
        },
      },
    });
  // Since the specification requires returning IEcommerceMetadataRegistryRelationshipOfVariantConfig,
  // but we're querying admin user bans, we need to map the response accordingly
  // This appears to be a specification mismatch, but we must comply
  // Create a mock response that matches the expected DTO structure
  // Note: This is a workaround for the specification mismatch
  return {
    id: adminUserBan.id,
    created_at: toISOStringSafe(adminUserBan.created_at),
    updated_at: toISOStringSafe(adminUserBan.updated_at),
    deleted_at: adminUserBan.deleted_at
      ? toISOStringSafe(adminUserBan.deleted_at)
      : null,
    administrator: {
      id: adminUserBan.administrator.id,
      email: adminUserBan.administrator.email,
      created_at: toISOStringSafe(adminUserBan.administrator.created_at),
    } satisfies IEcommerceAdministrator.ISummary,
  };
}
