import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequestDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestDashboard";
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

export async function getShoppingMallSuperAdminAdminPromotionRequestsDashboard(props: {
  superAdmin: SuperadminPayload;
}): Promise<IShoppingMallAdminPromotionRequestDashboard> {
  const total =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
      where: {
        deleted_at: null,
      },
    });
  const pending =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
      where: {
        status: "pending",
        deleted_at: null,
      },
    });
  const approved =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
      where: {
        status: "approved",
        deleted_at: null,
      },
    });
  const rejected =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.count({
      where: {
        status: "rejected",
        deleted_at: null,
      },
    });
  return {
    total,
    pending,
    approved,
    rejected,
  };
}
