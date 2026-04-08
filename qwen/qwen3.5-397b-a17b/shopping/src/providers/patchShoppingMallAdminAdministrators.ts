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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdministratorAtSummaryTransformer } from "../transformers/ShoppingMallAdministratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdministrators(props: {
  admin: AdminPayload;
  body: IShoppingMallAdministrator.IRequest;
}): Promise<IPageIShoppingMallAdministrator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.grade && { grade: props.body.grade }),
    ...(props.body.status === "deleted" && { deleted_at: { not: null } }),
    ...(props.body.status === "active" && {
      deleted_at: null,
      member: { adminProfile: { banned_at: null } },
    }),
    ...(props.body.status === "banned" && {
      deleted_at: null,
      member: { adminProfile: { banned_at: { not: null } } },
    }),
    created_at: {
      ...(props.body.created_at_from && { gte: props.body.created_at_from }),
      ...(props.body.created_at_to && { lte: props.body.created_at_to }),
    },
    ...(props.body.search && {
      OR: [
        {
          member: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
        {
          member: {
            customerProfile: {
              display_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    }),
  } satisfies Prisma.shopping_mall_administratorsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdministratorAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.shopping_mall_administrators.count({ where: whereInput }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdministratorAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
