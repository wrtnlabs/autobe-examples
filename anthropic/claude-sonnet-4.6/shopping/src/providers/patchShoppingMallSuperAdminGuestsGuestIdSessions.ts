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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallGuestSessionAtSummaryTransformer } from "../transformers/ShoppingMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminGuestsGuestIdSessions(props: {
  superAdmin: SuperadminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  // 1. Verify guest exists (auto 404 if not)
  await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    select: { id: true },
  });
  // 2. Build WHERE clause
  const whereInput = {
    shopping_mall_guest_id: props.guestId,
    ...(props.body.ip !== undefined && {
      ip: { startsWith: props.body.ip },
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
    ...(props.body.expiredAtFrom !== undefined ||
    props.body.expiredAtTo !== undefined
      ? {
          expired_at: {
            ...(props.body.expiredAtFrom !== undefined && {
              gte: new Date(props.body.expiredAtFrom),
            }),
            ...(props.body.expiredAtTo !== undefined && {
              lte: new Date(props.body.expiredAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_guest_sessionsWhereInput;
  // 3. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Query data + count (sequential)
  const data = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    ...ShoppingMallGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guest_sessions.count({
    where: whereInput,
  });
  // 5. Transform and return
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallGuestSessionAtSummaryTransformer.transform,
    ),
  };
}
