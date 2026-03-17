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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminGuestsGuestIdSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IShoppingMallGuestSession.IRequest;
}): Promise<IPageIShoppingMallGuestSession.ISummary> {
  // Step 1: Verify guest exists, 404 if not
  await MyGlobal.prisma.shopping_mall_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    select: { id: true },
  });
  // Step 2: Build filter WHERE clause
  const { body } = props;
  const whereInput = {
    shopping_mall_guest_id: props.guestId,
    ...(body.ip !== undefined && {
      ip: { startsWith: body.ip },
    }),
    ...(body.createdAtFrom !== undefined || body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined && {
              gte: new Date(body.createdAtFrom),
            }),
            ...(body.createdAtTo !== undefined && {
              lte: new Date(body.createdAtTo),
            }),
          },
        }
      : {}),
    ...(body.expiredAtFrom !== undefined || body.expiredAtTo !== undefined
      ? {
          expired_at: {
            ...(body.expiredAtFrom !== undefined && {
              gte: new Date(body.expiredAtFrom),
            }),
            ...(body.expiredAtTo !== undefined && {
              lte: new Date(body.expiredAtTo),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_guest_sessionsWhereInput;
  // Step 3: Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Step 4: Query data and total count sequentially
  const sessions = await MyGlobal.prisma.shopping_mall_guest_sessions.findMany({
    where: whereInput,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.shopping_mall_guest_sessions.count({
    where: whereInput,
  });
  // Step 5: Map to ISummary
  const data: IShoppingMallGuestSession.ISummary[] = sessions.map(
    (session) =>
      ({
        id: session.id,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: session.created_at.toISOString(),
        expired_at: session.expired_at.toISOString(),
      }) satisfies IShoppingMallGuestSession.ISummary,
  );
  // Step 6: Return paginated result
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallGuestSession.ISummary;
}
