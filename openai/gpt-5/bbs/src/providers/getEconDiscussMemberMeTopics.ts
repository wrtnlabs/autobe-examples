import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMeTopics(props: {
  member: MemberPayload;
}): Promise<IPageIEconDiscussTopic.ISummary> {
  const { member } = props;

  const current = 0;
  const limit = 20;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_user_topic_subscriptions.findMany({
      where: {
        deleted_at: null,
        econ_discuss_user_id: member.id,
        topic: { is: { deleted_at: null } },
      },
      orderBy: { created_at: "desc" },
      skip: current * limit,
      take: limit,
      select: {
        topic: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }),
    MyGlobal.prisma.econ_discuss_user_topic_subscriptions.count({
      where: {
        deleted_at: null,
        econ_discuss_user_id: member.id,
        topic: { is: { deleted_at: null } },
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.topic.id as string & tags.Format<"uuid">,
    code: r.topic.code,
    name: r.topic.name,
  }));

  // Removed redundant comparison causing TS2367 (no overlap) error.
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
