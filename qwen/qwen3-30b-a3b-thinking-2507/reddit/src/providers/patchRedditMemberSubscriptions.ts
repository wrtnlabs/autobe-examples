import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
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

export async function patchRedditMemberSubscriptions(props: {
  member: MemberPayload;
  body: IRedditCommunity.IRequest;
}): Promise<IPageIRedditCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      skip,
      take: limit,
      include: {
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            owner: {
              select: {
                id: true,
                email: true,
                created_at: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
  });
  const data = await Promise.all(
    subscriptions.map(async (sub) => {
      const communityId = sub.community_id;
      const subscriberCount =
        await MyGlobal.prisma.reddit_community_subscriptions.count({
          where: {
            community_id: communityId,
            deleted_at: null,
          },
        });
      return {
        id: sub.community.id,
        name: sub.community.name,
        description: sub.community.description,
        icon_url: sub.community.icon_url,
        owner: {
          id: sub.community.owner.id,
          email: sub.community.owner.email,
          created_at: toISOStringSafe(sub.community.owner.created_at),
        } satisfies IRedditMember.ISummary,
        subscriber_count: subscriberCount,
      } satisfies IRedditCommunity.ISummary;
    }),
  );
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data,
  } satisfies IPageIRedditCommunity.ISummary;
}
