import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMember";
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
import { ShoppingMallMemberAtSummaryTransformer } from "../transformers/ShoppingMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallMember.IRequest;
}): Promise<IPageIShoppingMallMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.deletedAtFrom && {
      deleted_at: { gte: new Date(props.body.deletedAtFrom) },
    }),
    ...(props.body.deletedAtTo && {
      deleted_at: { lte: new Date(props.body.deletedAtTo) },
    }),
  } satisfies Prisma.shopping_mall_membersWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_members.count({
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
      ShoppingMallMemberAtSummaryTransformer.transform,
    ),
  };
}
