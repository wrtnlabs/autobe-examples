import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";
import { IPageIRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchRedditCommunityCommunitiesCommunityNameRules(props: {
  communityName: string;
  body: IRedditCommunityCommunityRule.IRequest;
}): Promise<IPageIRedditCommunityCommunityRule.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "rule_number";
  const order = props.body.order ?? "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_rules.findMany({
      where: {
        community_id: community.id,
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
      orderBy: {
        [sortBy]: order,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_community_rules.count({
      where: {
        community_id: community.id,
        ...(props.body.search && {
          OR: [
            { title: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data: data.map((rule) => ({
      id: rule.id,
      community_id: rule.community_id,
      rule_number: rule.rule_number,
      title: rule.title,
      description: rule.description === null ? undefined : rule.description,
      created_at: toISOStringSafe(rule.created_at),
      updated_at: toISOStringSafe(rule.updated_at),
    })),
  };
}
