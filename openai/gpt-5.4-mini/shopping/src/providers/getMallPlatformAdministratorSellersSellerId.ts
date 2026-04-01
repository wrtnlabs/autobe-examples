import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function getMallPlatformAdministratorSellersSellerId(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformSeller> {
  const seller = await MyGlobal.prisma.mall_platform_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
    },
    select: {
      id: true,
      email: true,
      status: true,
      rejection_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: seller.id,
    email: seller.email,
    status: seller.status,
    rejectionReason: seller.rejection_reason,
    createdAt: seller.created_at.toISOString(),
    updatedAt: seller.updated_at.toISOString(),
    deletedAt: seller.deleted_at?.toISOString() ?? null,
  };
}
