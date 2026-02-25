import { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig";
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

export async function patchEcommerceAdministratorAdminUserBans(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistryRelationshipOfVariantConfig.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationshipOfVariantConfig.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering (currently basic - can be extended)
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.ecommerce_admin_user_bansWhereInput;
  const data = await MyGlobal.prisma.ecommerce_admin_user_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
    select: {
      id: true,
      user_type: true,
      ban_reason: true,
      ban_duration_days: true,
      banned_at: true,
      lifted_at: true,
      appeal_status: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_admin_user_bans.count({
    where: whereInput,
  });
  return {
    data: data.map(
      (ban) =>
        ({
          id: ban.id as string & tags.Format<"uuid">,
          user_type: ban.user_type,
          ban_reason: ban.ban_reason,
          ban_duration_days: ban.ban_duration_days ?? undefined,
          banned_at: ban.banned_at.toISOString() as string &
            tags.Format<"date-time">,
          lifted_at:
            (ban.lifted_at?.toISOString() as
              | (string & tags.Format<"date-time">)
              | null) ?? null,
          appeal_status: ban.appeal_status,
        }) satisfies IEcommerceMetadataRegistryRelationshipOfVariantConfig.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
