import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTopic";
import { IPageIEconomicBoardTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconomicBoardAdminTopics(props: {
  admin: AdminPayload;
  body: IEconomicBoardTopic.IRequest;
}): Promise<IPageIEconomicBoardTopic> {
  const { body } = props;

  // Extract and normalize pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Inline where and orderBy conditions
  const [topics, total] = await Promise.all([
    MyGlobal.prisma.economic_board_topics.findMany({
      where: {
        ...(body.name !== undefined && { name: { contains: body.name } }),
        ...(body.is_active !== undefined &&
          body.is_active !== null && { is_active: body.is_active }),
      },
      orderBy:
        body.sort === "name"
          ? { name: body.order === "desc" ? "desc" : "asc" }
          : body.sort === "created_at"
            ? { created_at: body.order === "desc" ? "desc" : "asc" }
            : body.sort === "updated_at"
              ? { updated_at: body.order === "desc" ? "desc" : "asc" }
              : { updated_at: "desc" }, // default sort
      skip,
      take: limit,
    }),
    MyGlobal.prisma.economic_board_topics.count({
      where: {
        ...(body.name !== undefined && { name: { contains: body.name } }),
        ...(body.is_active !== undefined &&
          body.is_active !== null && { is_active: body.is_active }),
      },
    }),
  ]);

  // Convert all date fields to ISO strings for response
  const data: IEconomicBoardTopic[] = topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    created_at: toISOStringSafe(topic.created_at),
    updated_at: toISOStringSafe(topic.updated_at),
    is_active: topic.is_active,
    description: topic.description,
  }));

  // Return paginated result
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
