import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityRule";

export async function getRedditLikeCommunitiesCommunityIdRules(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeCommunityRule> {
  const { communityId } = props;

  const rules = await MyGlobal.prisma.reddit_like_community_rules.findMany({
    where: {
      community_id: communityId,
    },
    orderBy: {
      display_order: "asc",
    },
  });

  const data: IRedditLikeCommunityRule[] = rules.map((rule) => ({
    id: rule.id,
    community_id: rule.community_id,
    title: rule.title,
    description: rule.description ?? undefined,
    rule_type: rule.rule_type,
    display_order: rule.display_order,
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  }));

  const totalRecords = data.length;

  return {
    pagination: {
      current: Number(0),
      limit: Number(totalRecords),
      records: Number(totalRecords),
      pages: Number(1),
    },
    data: data,
  };
}
