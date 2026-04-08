import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ShoppingMallAdminSessionAtSummaryTransformer } from "../transformers/ShoppingMallAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuestSessions(props: {
  guest: GuestPayload;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_admin_sessionsWhereInput = {
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.created_at !== undefined && {
      created_at: {
        ...(props.body.created_at.from !== undefined && {
          gte: new Date(props.body.created_at.from),
        }),
        ...(props.body.created_at.to !== undefined && {
          lte: new Date(props.body.created_at.to),
        }),
      },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lte: new Date() } : { gt: new Date() },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { ip: { contains: props.body.search } },
        { href: { contains: props.body.search } },
        { referrer: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.shopping_mall_admin_sessionsWhereInput;
  const orderByInput: Prisma.shopping_mall_admin_sessionsOrderByWithRelationInput =
    props.body.sort === "created_at,ASC"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const records = await MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_sessions.count({
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
      records,
      ShoppingMallAdminSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIShoppingMallAdminSession.ISummary;
}
