import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberDrafts(props: {
  member: MemberPayload;
}): Promise<IPageIEconDiscussPostDraft> {
  const { member } = props;

  // Default pagination (GET simple listing)
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_drafts.findMany({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
      orderBy: { updated_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        econ_discuss_post_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_post_drafts.count({
      where: {
        econ_discuss_user_id: member.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IEconDiscussPostDraft[] = rows.map((row) => ({
    id: row.id,
    title: row.title ?? null,
    body: row.body ?? null,
    post_id: row.econ_discuss_post_id ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  const pages = Math.max(1, Math.ceil(total / limit));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
