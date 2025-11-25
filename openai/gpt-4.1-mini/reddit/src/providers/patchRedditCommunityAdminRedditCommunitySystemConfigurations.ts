import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemConfiguration";
import { IPageIRedditCommunitySystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunitySystemConfigurations(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemConfiguration.IRequest;
}): Promise<IPageIRedditCommunitySystemConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null as unknown as null,
    ...(props.body.search
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_configurations.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        value: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_system_configurations.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((o) => ({
      id: o.id,
      name: o.name,
      value: o.value,
      created_at: toISOStringSafe(o.created_at),
      updated_at: toISOStringSafe(o.updated_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
