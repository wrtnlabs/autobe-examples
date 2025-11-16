import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { IPageIShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminGuestsGuestIdGuestSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 100;
  const skip = (page - 1) * limit;

  const whereCondition: Prisma.shopping_mall_guest_sessionsWhereInput = {
    shopping_mall_guest_id: props.guestId satisfies string as string,
  };

  const orderByCondition: Prisma.shopping_mall_guest_sessionsOrderByWithRelationInput =
    props.body.sortBy
      ? { [props.body.sortBy]: props.body.order === "asc" ? "asc" : "desc" }
      : { created_at: "desc" };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_guest_sessions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((item) => ({
      id: item.id,
      guest_id: item.shopping_mall_guest_id satisfies string as string,
      created_at: toISOStringSafe(item.created_at),
      ip: item.ip === null ? null : item.ip,
      user_agent: null, // user_agent property does not exist on Prisma type, set to null explicitly
      expires_at:
        item.expired_at === null ? null : toISOStringSafe(item.expired_at),
    })),
    pagination: {
      current: (page satisfies number as number)!,
      limit: (limit satisfies number as number)!,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
