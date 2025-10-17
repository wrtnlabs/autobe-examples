import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import { IETopicSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IETopicSortBy";
import { IESortDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortDirection";
import { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconDiscussTopics(props: {
  body: IEconDiscussTopic.IRequest;
}): Promise<IPageIEconDiscussTopic.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const q = body.q ?? "";
  const hasQ = q.length > 0;

  const sortBy = body.sortBy ?? "updatedAt";
  const sortDir = body.sortDir ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_topics.findMany({
      where: {
        deleted_at: null,
        ...(hasQ && {
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        }),
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy:
        sortBy === "name"
          ? { name: sortDir }
          : sortBy === "createdAt"
            ? { created_at: sortDir }
            : { updated_at: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_topics.count({
      where: {
        deleted_at: null,
        ...(hasQ && {
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        }),
      },
    }),
  ]);

  const data = rows.map((r) => ({ id: r.id, code: r.code, name: r.name }));

  const records = total;
  const pages = limit > 0 ? Math.ceil(records / limit) : 0;

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(records),
      pages: Number(pages),
    },
    data,
  };
}
