import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostDraft";
import { IEEconDiscussDraftSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussDraftSortBy";
import { IEEconDiscussSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussSortOrder";
import { IPageIEconDiscussPostDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostDraft";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberDrafts(props: {
  member: MemberPayload;
  body: IEconDiscussPostDraft.IRequest;
}): Promise<IPageIEconDiscussPostDraft> {
  const { member, body } = props;

  const page = Number(body.page);
  const limit = Number(body.pageSize);
  const skip = (page - 1) * limit;

  const whereCondition = {
    econ_discuss_user_id: member.id,
    deleted_at: null,
    ...(body.q !== undefined && body.q !== null && body.q.trim().length > 0
      ? {
          OR: [{ title: { contains: body.q } }, { body: { contains: body.q } }],
        }
      : {}),
    ...((body.updatedFrom !== undefined && body.updatedFrom !== null) ||
    (body.updatedTo !== undefined && body.updatedTo !== null)
      ? {
          updated_at: {
            ...(body.updatedFrom !== undefined &&
              body.updatedFrom !== null && {
                gte: toISOStringSafe(body.updatedFrom),
              }),
            ...(body.updatedTo !== undefined &&
              body.updatedTo !== null && {
                lte: toISOStringSafe(body.updatedTo),
              }),
          },
        }
      : {}),
    ...(body.publishedLink === true
      ? { econ_discuss_post_id: { not: null } }
      : body.publishedLink === false
        ? { econ_discuss_post_id: null }
        : {}),
  };

  const sortBy = body.sortBy ?? "updated_at";
  const order = body.order ?? "desc";

  const orderBy =
    sortBy === "title"
      ? [{ title: order }, { id: "desc" as Prisma.SortOrder }]
      : sortBy === "created_at"
        ? [{ created_at: order }, { id: "desc" as Prisma.SortOrder }]
        : [{ updated_at: order }, { id: "desc" as Prisma.SortOrder }];

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_drafts.findMany({
      where: whereCondition,
      orderBy,
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
    MyGlobal.prisma.econ_discuss_post_drafts.count({ where: whereCondition }),
  ]);

  const data: IEconDiscussPostDraft[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    title: r.title ?? null,
    body: r.body ?? null,
    post_id: (r.econ_discuss_post_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(pages) as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
