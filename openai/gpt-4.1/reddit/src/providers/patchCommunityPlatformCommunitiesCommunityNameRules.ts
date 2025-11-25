import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { IPageICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

export async function patchCommunityPlatformCommunitiesCommunityNameRules(props: {
  communityName: string;
  body: ICommunityPlatformCommunityRule.IRequest;
}): Promise<IPageICommunityPlatformCommunityRule.ISummary> {
  const { communityName, body } = props;
  // 1. Find the community by unique name
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { name: communityName, deleted_at: null },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Parse pagination and filtering
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = body.sort_by ?? "display_order";
  const order: "asc" | "desc" = body.order ?? "asc";

  // 3. Build where condition
  const where: Record<string, unknown> = {
    community_platform_community_id: community.id,
    ...(typeof body.enforced === "boolean" && { enforced: body.enforced }),
    ...(body.search && {
      OR: [
        { code: { contains: body.search } },
        { description: { contains: body.search } },
      ],
    }),
  };

  // 4. Query rules with community join (for each rule result)
  const [total, records] = await Promise.all([
    MyGlobal.prisma.community_platform_community_rules.count({ where }),
    MyGlobal.prisma.community_platform_community_rules.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      include: {
        community: true,
      },
    }),
  ]);

  // 5. Project each result into DTOs
  const pageData = records.map((rule) => ({
    id: rule.id,
    community: {
      id: rule.community.id,
      name: rule.community.name,
      display_title: rule.community.display_title,
      description: rule.community.description,
      visibility: rule.community.visibility,
      image_url:
        rule.community.image_url === null
          ? undefined
          : rule.community.image_url,
      status: rule.community.status,
    },
    code: rule.code,
    description: rule.description,
    display_order: rule.display_order,
    enforced: rule.enforced,
    created_at: toISOStringSafe(rule.created_at),
    updated_at: toISOStringSafe(rule.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: pageData,
  };
}
