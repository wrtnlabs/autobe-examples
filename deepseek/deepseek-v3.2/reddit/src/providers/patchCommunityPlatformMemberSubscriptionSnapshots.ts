import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionSnapshot";
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

export async function patchCommunityPlatformMemberSubscriptionSnapshots(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscriptionSnapshot.IRequest;
}): Promise<IPageICommunityPlatformSubscriptionSnapshot.ISummary> {
  // Build WHERE clause with member authorization filter (only show member's own snapshots)
  const whereInput: Prisma.community_platform_subscription_snapshotsWhereInput =
    {
      user_id: props.member.id, // Members can only view their own subscription snapshots
      ...(props.body.user_id !== undefined && { user_id: props.body.user_id }),
      ...(props.body.community_id !== undefined && {
        community_id: props.body.community_id,
      }),
      ...(props.body.community_platform_subscription_id !== undefined && {
        community_platform_subscription_id:
          props.body.community_platform_subscription_id,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.posting_permission_granted !== undefined && {
        posting_permission_granted: props.body.posting_permission_granted,
      }),
      ...(props.body.feed_included !== undefined && {
        feed_included: props.body.feed_included,
      }),
    };
  // Handle date range filters
  if (
    props.body.subscribed_at_start !== undefined ||
    props.body.subscribed_at_end !== undefined
  ) {
    whereInput.subscribed_at = {
      ...(props.body.subscribed_at_start !== undefined && {
        gte: new Date(props.body.subscribed_at_start),
      }),
      ...(props.body.subscribed_at_end !== undefined && {
        lte: new Date(props.body.subscribed_at_end),
      }),
    };
  }
  if (
    props.body.unsubscribed_at_start !== undefined ||
    props.body.unsubscribed_at_end !== undefined
  ) {
    whereInput.unsubscribed_at = {
      ...(props.body.unsubscribed_at_start !== undefined && {
        gte: new Date(props.body.unsubscribed_at_start),
      }),
      ...(props.body.unsubscribed_at_end !== undefined && {
        lte: new Date(props.body.unsubscribed_at_end),
      }),
    };
  }
  if (
    props.body.created_at_start !== undefined ||
    props.body.created_at_end !== undefined
  ) {
    whereInput.created_at = {
      ...(props.body.created_at_start !== undefined && {
        gte: new Date(props.body.created_at_start),
      }),
      ...(props.body.created_at_end !== undefined && {
        lte: new Date(props.body.created_at_end),
      }),
    };
  }
  // Handle pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Determine order by
  const orderByInput = (
    props.body.sort === "subscribed_at"
      ? { subscribed_at: "desc" as const }
      : props.body.sort === "unsubscribed_at"
        ? { unsubscribed_at: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.community_platform_subscription_snapshotsOrderByWithRelationInput;
  // Query data
  const data =
    await MyGlobal.prisma.community_platform_subscription_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        status: true,
        posting_permission_granted: true,
        feed_included: true,
        subscribed_at: true,
        unsubscribed_at: true,
        created_at: true,
        subscription: {
          select: {
            id: true,
            active: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                email_verified: true,
                registered_at: true,
                last_login_at: true,
              } satisfies Prisma.community_platform_membersFindManyArgs,
            },
            community: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                ownerMember: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    nickname: true,
                    email_verified: true,
                    registered_at: true,
                    last_login_at: true,
                  } satisfies Prisma.community_platform_membersFindManyArgs,
                },
              } satisfies Prisma.community_platform_communitiesFindManyArgs,
            },
          } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
        },
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          } satisfies Prisma.community_platform_membersFindManyArgs,
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            ownerMember: {
              select: {
                id: true,
                email: true,
                username: true,
                nickname: true,
                email_verified: true,
                registered_at: true,
                last_login_at: true,
              } satisfies Prisma.community_platform_membersFindManyArgs,
            },
          } satisfies Prisma.community_platform_communitiesFindManyArgs,
        },
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.community_platform_subscription_snapshots.count({
      where: whereInput,
    });
  // Transform data to DTO format
  const transformedData = data.map(
    (snapshot) =>
      ({
        id: snapshot.id,
        status: snapshot.status,
        posting_permission_granted: snapshot.posting_permission_granted,
        feed_included: snapshot.feed_included,
        subscribed_at: snapshot.subscribed_at?.toISOString() ?? null,
        unsubscribed_at: snapshot.unsubscribed_at?.toISOString() ?? null,
        created_at: snapshot.created_at.toISOString(),
        subscription: {
          id: snapshot.subscription.id,
          active: snapshot.subscription.active,
          member: {
            id: snapshot.subscription.member.id,
            email: snapshot.subscription.member.email,
            username: snapshot.subscription.member.username,
            nickname: snapshot.subscription.member.nickname ?? undefined,
            email_verified: snapshot.subscription.member.email_verified,
            registered_at:
              snapshot.subscription.member.registered_at.toISOString(),
            last_login_at:
              snapshot.subscription.member.last_login_at?.toISOString() ??
              undefined,
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: snapshot.subscription.community.id,
            name: snapshot.subscription.community.name,
            description: snapshot.subscription.community.description,
            created_at:
              snapshot.subscription.community.created_at.toISOString(),
            owner: {
              id: snapshot.subscription.community.ownerMember.id,
              email: snapshot.subscription.community.ownerMember.email,
              username: snapshot.subscription.community.ownerMember.username,
              nickname:
                snapshot.subscription.community.ownerMember.nickname ??
                undefined,
              email_verified:
                snapshot.subscription.community.ownerMember.email_verified,
              registered_at:
                snapshot.subscription.community.ownerMember.registered_at.toISOString(),
              last_login_at:
                snapshot.subscription.community.ownerMember.last_login_at?.toISOString() ??
                undefined,
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: 0, // TODO: Need to fetch from MV view
          } satisfies ICommunityPlatformCommunity.ISummary,
          created_at: snapshot.subscription.created_at.toISOString(),
          updated_at: snapshot.subscription.updated_at.toISOString(),
          deleted_at: snapshot.subscription.deleted_at?.toISOString() ?? null,
        } satisfies ICommunityPlatformSubscription.ISummary,
        user: {
          id: snapshot.user.id,
          email: snapshot.user.email,
          username: snapshot.user.username,
          nickname: snapshot.user.nickname ?? undefined,
          email_verified: snapshot.user.email_verified,
          registered_at: snapshot.user.registered_at.toISOString(),
          last_login_at:
            snapshot.user.last_login_at?.toISOString() ?? undefined,
        } satisfies ICommunityPlatformMember.ISummary,
        community: {
          id: snapshot.community.id,
          name: snapshot.community.name,
          description: snapshot.community.description,
          created_at: snapshot.community.created_at.toISOString(),
          owner: {
            id: snapshot.community.ownerMember.id,
            email: snapshot.community.ownerMember.email,
            username: snapshot.community.ownerMember.username,
            nickname: snapshot.community.ownerMember.nickname ?? undefined,
            email_verified: snapshot.community.ownerMember.email_verified,
            registered_at:
              snapshot.community.ownerMember.registered_at.toISOString(),
            last_login_at:
              snapshot.community.ownerMember.last_login_at?.toISOString() ??
              undefined,
          } satisfies ICommunityPlatformMember.ISummary,
          subscriber_count: 0, // TODO: Need to fetch from MV view
        } satisfies ICommunityPlatformCommunity.ISummary,
      }) satisfies ICommunityPlatformSubscriptionSnapshot.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageICommunityPlatformSubscriptionSnapshot.ISummary;
}
