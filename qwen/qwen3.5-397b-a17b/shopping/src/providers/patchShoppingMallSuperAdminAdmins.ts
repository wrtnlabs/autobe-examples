import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
import { ShoppingMallAdminAtSummaryTransformer } from "../transformers/ShoppingMallAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_adminsWhereInput = {
    ...(props.body.search?.email && {
      email: { contains: props.body.search.email },
    }),
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    ...(props.body.banned !== undefined && {
      banned_at: props.body.banned ? { not: null } : null,
    }),
    ...(props.body.deleted !== undefined && {
      deleted_at: props.body.deleted ? { not: null } : null,
    }),
    ...(props.body.created_at && {
      created_at: {
        ...(props.body.created_at.from && { gte: props.body.created_at.from }),
        ...(props.body.created_at.to && { lte: props.body.created_at.to }),
      },
    }),
  } satisfies Prisma.shopping_mall_adminsWhereInput;
  const orderByInput: Prisma.shopping_mall_adminsOrderByWithRelationInput = {
    [props.body.sort?.field ?? "created_at"]: props.body.sort?.order ?? "desc",
  } satisfies Prisma.shopping_mall_adminsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_admins.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admins.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallAdmin.ISummary;
}
