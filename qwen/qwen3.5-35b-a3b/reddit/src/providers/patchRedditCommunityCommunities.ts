import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunities(props: {
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_communitiesWhereInput = {
    deleted_at: null,
    ...(props.body.name && {
      name: {
        contains: props.body.name,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.reddit_community_communitiesWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { name: "asc" as const },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            created_at: true,
          },
        },
        icon: {
          select: {
            file: {
              select: {
                file_path: true,
              },
            },
          },
          include: {
            file: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_communities.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: (await ArrayUtil.asyncMap(data, async (community) => ({
      id: community.id as string & tags.Format<"uuid">,
      name: community.name,
      description: community.description,
      subscriber_count: community.subscriber_count,
      owner: {
        id: community.owner.id as string & tags.Format<"uuid">,
        username: community.owner.username,
        created_at: community.owner.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditCommunityMember.ISummary,
      created_at: community.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: community.updated_at.toISOString() as string &
        tags.Format<"date-time">,
      deleted_at:
        community.deleted_at?.toISOString() ??
        (null as (string & tags.Format<"date-time">) | null),
      icon_url:
        community.icon?.file.file_path ??
        (undefined as (string & tags.Format<"uri">) | undefined),
    }))) satisfies IRedditCommunityCommunity.ISummary[],
  };
}
