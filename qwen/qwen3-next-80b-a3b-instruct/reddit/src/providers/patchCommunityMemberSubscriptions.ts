import { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunitySubscription.IRequest;
}): Promise<IPageICommunitySubscription.ISummary> {
  const cursor = (props.body as any).cursor ?? null;
  const limit = (props.body as any).limit ?? 10;
  const whereInput = {
    community_member_id: props.member.id,
    created_at: cursor ? { lt: cursor } : undefined,
  } satisfies Prisma.community_subscriptionsWhereInput;
  const data = await MyGlobal.prisma.community_subscriptions.findMany({
    where: whereInput,
    take: limit + 1,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      community_community_id: true,
      community: {
        select: {
          name: true,
          description: true,
          icon_url: true,
        },
      },
      member: {
        select: {
          display_name: true,
          avatar_url: true,
        },
      },
      created_at: true,
    },
  });
  const hasNextPage = data.length > limit;
  if (hasNextPage) {
    data.pop();
  }
  const nextCursor = hasNextPage ? data[data.length - 1].created_at : null;
  const total = await MyGlobal.prisma.community_subscriptions.count({
    where: whereInput,
  });
  return {
    data: data.map((sub) => ({
      id: sub.id,
      community_id: sub.community_community_id,
      community_name: sub.community.name,
      community_description: sub.community.description,
      community_icon_url: sub.community.icon_url,
      member_display_name: sub.member.display_name,
      member_avatar_url: sub.member.avatar_url,
      created_at: toISOStringSafe(sub.created_at),
    })),
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
