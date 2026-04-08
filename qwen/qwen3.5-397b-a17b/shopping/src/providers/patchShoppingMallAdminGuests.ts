import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallGuestAtSummaryTransformer } from "../transformers/ShoppingMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminGuests(props: {
  admin: AdminPayload;
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          ...(props.body.created_at_from !== undefined &&
            props.body.created_at_from !== null && {
              gte: new Date(props.body.created_at_from),
            }),
          ...(props.body.created_at_to !== undefined &&
            props.body.created_at_to !== null && {
              lte: new Date(props.body.created_at_to),
            }),
        }
      : undefined;
  const whereInput: Prisma.shopping_mall_guestsWhereInput = {
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        device_fingerprint: { contains: props.body.search },
      }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    deleted_at: props.body.deleted === true ? { not: null } : null,
  };
  const data = await MyGlobal.prisma.shopping_mall_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guests.count({
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
      ShoppingMallGuestAtSummaryTransformer.transform,
    ),
  };
}
