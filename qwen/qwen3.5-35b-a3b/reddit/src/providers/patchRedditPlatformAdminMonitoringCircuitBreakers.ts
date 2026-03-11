import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformAdminMonitoringCircuitBreakers(props: {
  admin: AdminPayload;
  body: IRedditPlatformCommunitySubscription.IRequest;
}): Promise<IPageIRedditPlatformCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const cappedLimit = limit > 100 ? 100 : limit;
  const skip = (page - 1) * cappedLimit;
  const whereInput: Prisma.reddit_platform_community_subscriptionsWhereInput = {
    deleted_at: null,
    ...(props.body.serviceName
      ? {
          member: {
            email: { contains: props.body.serviceName, mode: "insensitive" },
          },
        }
      : {}),
  } satisfies Prisma.reddit_platform_community_subscriptionsWhereInput;
  const data =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: cappedLimit,
      orderBy: {
        subscribed_at: (props.body.sortOrder ?? "desc") as "asc" | "desc",
      },
      select: {
        id: true,
        reddit_platform_member_id: true,
        reddit_platform_community_id: true,
        subscribed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: cappedLimit,
      records: total,
      pages: Math.ceil(total / cappedLimit),
    } satisfies IPage.IPagination,
    data: data.map((r) => ({
      id: r.id,
      serviceName: r.member.email,
      state: r.deleted_at === null ? "closed" : "open",
      failureCount: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      successCount: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      lastFailureTime: toISOStringSafe(r.subscribed_at),
      openedAt: r.deleted_at?.toISOString() ?? null,
      nextProbeTime: null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
    })) satisfies IRedditPlatformCommunitySubscription.ISummary[],
  } satisfies IPageIRedditPlatformCommunitySubscription.ISummary;
}
