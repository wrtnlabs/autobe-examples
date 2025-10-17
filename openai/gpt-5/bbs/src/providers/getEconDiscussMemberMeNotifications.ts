import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussNotification";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMeNotifications(props: {
  member: MemberPayload;
}): Promise<IPageIEconDiscussNotification> {
  const DEFAULT_CURRENT_PAGE = 0;
  const DEFAULT_LIMIT = 20;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_notifications.findMany({
      where: {
        recipient_user_id: props.member.id,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip: DEFAULT_CURRENT_PAGE * DEFAULT_LIMIT,
      take: DEFAULT_LIMIT,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        actor_user_id: true,
        entity_type: true,
        entity_id: true,
        read_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_notifications.count({
      where: {
        recipient_user_id: props.member.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussNotification[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    type: r.type,
    title: r.title,
    body: r.body ?? undefined,
    actorUserId:
      r.actor_user_id === null
        ? undefined
        : (r.actor_user_id as string & tags.Format<"uuid">),
    entityType: r.entity_type ?? undefined,
    entityId:
      r.entity_id === null
        ? undefined
        : (r.entity_id as string & tags.Format<"uuid">),
    isRead: r.read_at !== null,
    readAt: r.read_at ? toISOStringSafe(r.read_at) : undefined,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
  }));

  const limitNum = Number(DEFAULT_LIMIT);
  const currentNum = Number(DEFAULT_CURRENT_PAGE);
  const recordsNum = Number(total);
  const pagesNum = recordsNum === 0 ? 0 : Math.ceil(recordsNum / limitNum);

  return {
    pagination: {
      current: currentNum,
      limit: limitNum,
      records: recordsNum,
      pages: pagesNum,
    },
    data,
  };
}
