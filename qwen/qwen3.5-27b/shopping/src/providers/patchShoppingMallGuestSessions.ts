import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ShoppingMallGuestSessionAtSummaryTransformer } from "../transformers/ShoppingMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuestSessions(props: {
  guest: GuestPayload;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_guest_sessionsWhereInput = {
    shopping_mall_guest_id: props.guest.id,
  };
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "active") {
      whereInput.expired_at = { gt: now };
    } else if (props.body.status === "expired") {
      whereInput.expired_at = { lte: now };
    }
  }
  if (props.body.startDate !== undefined || props.body.endDate !== undefined) {
    const created_atFilter: Prisma.DateTimeFilter = {};
    if (props.body.startDate !== undefined) {
      created_atFilter.gte = new Date(props.body.startDate);
    }
    if (props.body.endDate !== undefined) {
      created_atFilter.lte = new Date(props.body.endDate);
    }
    whereInput.created_at = created_atFilter;
  }
  const orderByInput: Prisma.shopping_mall_guest_sessionsOrderByWithRelationInput =
    props.body.sort !== undefined && props.body.order !== undefined
      ? {
          [props.body.sort]: props.body.order,
        }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ShoppingMallGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guest_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
