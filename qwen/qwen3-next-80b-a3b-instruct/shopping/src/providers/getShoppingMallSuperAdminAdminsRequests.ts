import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminPasswordResetAtSummaryTransformer } from "../transformers/ShoppingMallAdminPasswordResetAtSummaryTransformer";

export async function getShoppingMallSuperAdminAdminsRequests(props: {
  superAdmin: SuperadminPayload;
}): Promise<IPageIShoppingMallAdminPasswordReset.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Fetch data with transformer's select structure
  const data =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdminPasswordResetAtSummaryTransformer.select(),
    });
  // Count total records with same where conditions
  const total = await MyGlobal.prisma.shopping_mall_admin_password_resets.count(
    {
      where: {},
    },
  );
  // Transform array of results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallAdminPasswordResetAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
