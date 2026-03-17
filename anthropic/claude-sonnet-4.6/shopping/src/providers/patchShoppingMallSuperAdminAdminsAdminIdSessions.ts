import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminSessionAtSummaryTransformer } from "../transformers/ShoppingMallAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdminsAdminIdSessions(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  // Step 1: Validate that the target admin exists (returns 404 if not found)
  await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    select: { id: true },
  });
  // Step 2: Build WHERE clause with optional filters
  const whereInput = {
    shopping_mall_admin_id: props.adminId,
    ...(props.body.onlyActive === true && {
      expired_at: { gt: new Date() },
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined && {
              gte: new Date(props.body.createdAtFrom),
            }),
            ...(props.body.createdAtTo !== undefined && {
              lte: new Date(props.body.createdAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_admin_sessionsWhereInput;
  // Step 3: Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Query
  const data = await MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_sessions.count({
    where: whereInput,
  });
  // Step 5: Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
