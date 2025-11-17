import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityNameCommunitySubscriptions(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  body: IRedditCommunityCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunityCommunitySubscription.ISummary> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName, deleted_at: null },
    });

  if (!community) {
    throw new HttpException(
      `Community with name ${props.communityName} not found`,
      404,
    );
  }

  const page = props.body.page > 0 ? props.body.page : 1;
  const limit = props.body.limit > 0 ? props.body.limit : 10;
  const skip = (page - 1) * limit;

  const registereduserWhere = props.body.search
    ? ({
        OR: [{ email: { contains: props.body.search, mode: "insensitive" } }],
      } satisfies Prisma.reddit_community_registeredusersWhereInput)
    : undefined;

  const whereCondition: Prisma.reddit_community_community_subscriptionsWhereInput =
    {
      community_id: community.id,
      deleted_at: null,
      registereduser: registereduserWhere,
    };

  const orderByCondition: Prisma.Enumerable<Prisma.reddit_community_community_subscriptionsOrderByWithRelationInput> =
    props.body.orderBy
      ? {
          [props.body.orderBy]: props.body.orderDirection ?? "asc",
        }
      : { created_at: "desc" };

  const [total, subscriptions] = await Promise.all([
    MyGlobal.prisma.reddit_community_community_subscriptions.count({
      where: whereCondition,
    }),
    MyGlobal.prisma.reddit_community_community_subscriptions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
      include: {
        registereduser: true,
        community: true,
      },
    }),
  ]);

  return {
    data: subscriptions.map((sub) => {
      const subscription = sub as typeof sub & {
        registereduser: NonNullable<(typeof sub)["registereduser"]>;
        community: NonNullable<(typeof sub)["community"]>;
      };

      return {
        id: subscription.id,
        registereduser: {
          id: subscription.registereduser.id,
          email: subscription.registereduser.email,
          created_at: toISOStringSafe(subscription.registereduser.created_at),
          updated_at: toISOStringSafe(subscription.registereduser.updated_at),
          deleted_at: subscription.registereduser.deleted_at
            ? toISOStringSafe(subscription.registereduser.deleted_at)
            : null,
        },
        community: {
          id: subscription.community.id,
          name: subscription.community.name,
          title: subscription.community.title,
          description: subscription.community.description ?? undefined,
          creator_id: subscription.community.creator_id,
          created_at: toISOStringSafe(subscription.community.created_at),
          updated_at: toISOStringSafe(subscription.community.updated_at),
          deleted_at: subscription.community.deleted_at
            ? toISOStringSafe(subscription.community.deleted_at)
            : null,
        },
      };
    }),
    pagination: {
      current: page satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: Math.ceil(
        total / limit,
      ) satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
