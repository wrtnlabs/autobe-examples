import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IPageIRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityModerators(props: {
  admin: AdminPayload;
  body: IRedditCommunityModerator.IRequest;
}): Promise<IPageIRedditCommunityModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereClause = {
    deleted_at: null as null,
    ...(props.body.search
      ? {
          OR: [
            {
              email: {
                contains: props.body.search,
                mode: "insensitive" as any,
              },
            },
          ],
        }
      : {}),
  };

  const orderByClause =
    props.body.sortBy && props.body.sortOrder
      ? { [props.body.sortBy]: props.body.sortOrder as "asc" | "desc" }
      : { created_at: "desc" as "desc" };

  const [moderators, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_moderators.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: orderByClause,
    }),
    MyGlobal.prisma.reddit_community_moderators.count({ where: whereClause }),
  ]);

  return {
    data: moderators.map((m) => ({
      id: m.id as string & tags.Format<"uuid">,
      email: m.email,
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
      deleted_at: m.deleted_at ? toISOStringSafe(m.deleted_at) : null,
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
