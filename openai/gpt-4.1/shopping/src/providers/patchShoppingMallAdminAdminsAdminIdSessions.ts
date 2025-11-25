import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  // Pagination defaults
  const pageVal = props.body.page ?? 1;
  const limitVal = props.body.limit ?? 20;
  const page: number & tags.Type<"int32"> = pageVal as number &
    tags.Type<"int32">;
  const limit: number & tags.Type<"int32"> = limitVal as number &
    tags.Type<"int32">;
  const skip = (page - 1) * limit;

  // Sort logic
  const sortableKeys = ["created_at", "ip", "referrer", "href"];
  const sortBy =
    props.body.sort_by && sortableKeys.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder: "asc" | "desc" =
    props.body.sort_order === "asc" ? "asc" : "desc";

  // Where clause range for created_at
  let createdAtCondition:
    | {
        gte?: string & tags.Format<"date-time">;
        lte?: string & tags.Format<"date-time">;
      }
    | undefined = undefined;
  if (props.body.created_from || props.body.created_to) {
    createdAtCondition = {};
    if (props.body.created_from)
      createdAtCondition.gte = props.body.created_from;
    if (props.body.created_to) createdAtCondition.lte = props.body.created_to;
  }

  const where = {
    shopping_mall_admin_id: props.adminId,
    ...(props.body.ip ? { ip: props.body.ip } : {}),
    ...(props.body.referrer ? { referrer: props.body.referrer } : {}),
    ...(props.body.href ? { href: props.body.href } : {}),
    ...(createdAtCondition ? { created_at: createdAtCondition } : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_admin_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  }));

  const pagesNum = Math.ceil(total / limit);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: pagesNum as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
