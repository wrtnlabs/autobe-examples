import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberMembersUsernameSubscriptions(props: {
  member: MemberPayload;
  username: string;
  body: IRedditCommunityCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunityCommunitySubscription> {
  const memberRecord =
    await MyGlobal.prisma.reddit_community_members.findUnique({
      where: { username: props.username },
    });

  if (!memberRecord) {
    throw new HttpException("Member not found", 404);
  }

  if (memberRecord.id !== props.member.id) {
    throw new HttpException("You can only view your own subscriptions", 403);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_subscriptions.findMany({
      where: {
        member_id: memberRecord.id,
        ...(props.body.search && {
          community: {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                display_title: {
                  contains: props.body.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          },
        }),
      },
      include: {
        community: true,
      },
      orderBy:
        props.body.sort_by === "subscription_date"
          ? { created_at: props.body.order ?? "desc" }
          : props.body.sort_by === "community_name"
            ? { community: { name: props.body.order ?? "asc" } }
            : props.body.sort_by === "subscriber_count"
              ? { community: { subscriber_count: props.body.order ?? "desc" } }
              : { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_community_subscriptions.count({
      where: {
        member_id: memberRecord.id,
        ...(props.body.search && {
          community: {
            OR: [
              {
                name: {
                  contains: props.body.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                display_title: {
                  contains: props.body.search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          },
        }),
      },
    }),
  ]);

  const data: IRedditCommunityCommunitySubscription[] = subscriptions.map(
    (sub) => {
      const community = sub.community;
      return {
        id: community.id,
        name: community.name,
        title: community.display_title,
        description: community.description,
        icon_url: community.icon_url ?? undefined,
        banner_url: community.banner_url ?? undefined,
        subscriber_count: community.subscriber_count,
        post_count: community.post_count,
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
        deleted_at: community.deleted_at
          ? toISOStringSafe(community.deleted_at)
          : undefined,
      };
    },
  );

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
