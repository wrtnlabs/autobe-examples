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

export async function getEconDiscussTopics(): Promise<IPageIEconDiscussTopic> {
  try {
    // Default pagination since endpoint has no query parameters
    const page = 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_discuss_topics.findMany({
        where: { deleted_at: null },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.econ_discuss_topics.count({
        where: { deleted_at: null },
      }),
    ]);

    const data: IEconDiscussTopic[] = rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    const pages = Math.ceil(total / limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: Number(total),
        pages: Number(pages),
      },
      data,
    };
  } catch {
    throw new HttpException("Internal Server Error", 500);
  }
}
