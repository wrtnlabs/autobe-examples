import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where: props.body.search
        ? {
            OR: [
              { name: { contains: props.body.search, mode: "insensitive" } },
              {
                display_title: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
      skip,
      take: limit,
      orderBy: props.body.sort_by
        ? { [props.body.sort_by]: props.body.order ?? "desc" }
        : { created_at: "desc" },
    }),
    MyGlobal.prisma.reddit_community_communities.count({
      where: props.body.search
        ? {
            OR: [
              { name: { contains: props.body.search, mode: "insensitive" } },
              {
                display_title: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
    }),
  ]);

  return {
    pagination: {
      current: page - 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((community) => ({
      id: community.id as string & tags.Format<"uuid">,
      name: community.name,
      display_title: community.display_title,
      created_at: toISOStringSafe(community.created_at),
    })),
  };
}
