import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorRedditCommunitySystemConfigurations(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunitySystemConfiguration.IRequest;
}): Promise<IPageIRedditCommunitySystemConfiguration.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const search = body.search;

  const where = search
    ? {
        OR: [
          { config_key: { contains: search } },
          { config_value: { contains: search } },
        ],
      }
    : {};

  const orderBy = body.sortKey
    ? {
        [body.sortKey]: (body.sortOrder === "asc" ? "asc" : "desc") satisfies
          | "asc"
          | "desc" as "asc" | "desc",
      }
    : { created_at: "desc" satisfies "asc" | "desc" as "asc" | "desc" };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_configurations.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_system_configurations.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((item) => ({
      id: item.id,
      config_key: item.config_key,
      config_value: item.config_value,
      description: item.description ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
