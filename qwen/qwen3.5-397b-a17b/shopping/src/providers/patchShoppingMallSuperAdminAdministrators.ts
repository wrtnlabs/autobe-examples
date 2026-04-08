import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdministrators(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const statusFilter = props.body.status;
  const gradeFilter = props.body.grade;
  const searchQuery = props.body.search;
  const createdAtFrom = props.body.created_at_from;
  const createdAtTo = props.body.created_at_to;
  const whereInput: Prisma.shopping_mall_administratorsWhereInput = {
    ...(statusFilter === "deleted" && { deleted_at: { not: null } }),
    ...(statusFilter !== "deleted" && { deleted_at: null }),
    ...(gradeFilter !== undefined &&
      gradeFilter !== null && { grade: gradeFilter }),
    ...(createdAtFrom !== undefined &&
      createdAtFrom !== null && {
        created_at: { gte: new Date(createdAtFrom) },
      }),
    ...(createdAtTo !== undefined &&
      createdAtTo !== null && {
        created_at: { lte: new Date(createdAtTo) },
      }),
    ...(statusFilter === "banned" && {
      member: {
        adminProfile: { banned_at: { not: null } },
      },
    }),
    ...(statusFilter === "active" && {
      member: {
        adminProfile: { banned_at: null },
      },
    }),
    ...(searchQuery !== undefined &&
      searchQuery !== null &&
      searchQuery.length > 0 && {
        OR: [
          {
            member: {
              adminProfile: {
                email: { contains: searchQuery, mode: "insensitive" },
              },
            },
          },
          {
            member: {
              customerProfile: {
                display_name: { contains: searchQuery, mode: "insensitive" },
              },
            },
          },
        ],
      }),
  };
  const data = await MyGlobal.prisma.shopping_mall_administrators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdministratorAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_administrators.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdministratorAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallAdministrator.ISummary;
}
