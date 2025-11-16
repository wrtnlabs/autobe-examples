import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { IPageIRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunitySystemSettings(props: {
  admin: AdminPayload;
  body: IRedditCommunitySystemSetting.IRequest;
}): Promise<IPageIRedditCommunitySystemSetting.ISummary> {
  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 100;

  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination parameters", 400);
  }

  const skip = (page - 1) * limit;

  const whereCondition = props.body.search
    ? {
        OR: [
          { name: { contains: props.body.search } },
          { value: { contains: props.body.search } },
        ],
      }
    : {};

  const [results, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_settings.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy:
        props.body.sort_by && props.body.order
          ? { [props.body.sort_by]: props.body.order }
          : { created_at: "desc" },
    }),
    MyGlobal.prisma.reddit_community_system_settings.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      name: item.name,
      value: item.value,
      description: item.description === null ? undefined : item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
