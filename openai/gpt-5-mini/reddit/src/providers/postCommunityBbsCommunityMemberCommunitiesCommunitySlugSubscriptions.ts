import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySubscription";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommunitiesCommunitySlugSubscriptions(props: {
  communityMember: CommunitymemberPayload;
  communitySlug: string;
  body: ICommunityBbsCommunitySubscription.ICreate;
}): Promise<ICommunityBbsCommunitySubscription> {
  const { communityMember, communitySlug, body } = props;

  if (!communityMember) throw new HttpException("Unauthorized", 401);

  const allowedLevels = ["all", "mentions", "none"] as const;
  if (!allowedLevels.includes(body.notification_level))
    throw new HttpException("Bad Request: invalid notification_level", 400);

  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { slug: communitySlug },
  });
  if (!community) throw new HttpException("Not Found", 404);

  if (community.visibility !== "public") {
    const membership =
      await MyGlobal.prisma.community_bbs_community_memberships.findFirst({
        where: {
          community_id: community.id,
          community_member_id: communityMember.id,
        },
      });

    const hasAccess =
      membership !== null &&
      (membership.status === "member" ||
        membership.invited_by_id !== null ||
        membership.status === "pending" ||
        membership.status === "requested");

    if (!hasAccess) throw new HttpException("Forbidden", 403);
  }

  const now = toISOStringSafe(new Date());

  try {
    const result = await MyGlobal.prisma.$transaction(async (tx) => {
      const existing =
        await tx.community_bbs_community_subscriptions.findUnique({
          where: {
            community_id_community_member_id: {
              community_id: community.id,
              community_member_id: communityMember.id,
            },
          },
        });

      let subscription;
      let becameActive = false;

      if (existing) {
        if (existing.is_active) {
          if (existing.notification_level !== body.notification_level) {
            subscription =
              await tx.community_bbs_community_subscriptions.update({
                where: { id: existing.id },
                data: {
                  notification_level: body.notification_level,
                  updated_at: now,
                },
              });
          } else {
            subscription = existing;
          }
        } else {
          subscription = await tx.community_bbs_community_subscriptions.update({
            where: { id: existing.id },
            data: {
              is_active: true,
              notification_level: body.notification_level,
              subscribed_at: now,
              updated_at: now,
              deleted_at: null,
            },
          });
          becameActive = true;
        }
      } else {
        const newId = v4() as string & tags.Format<"uuid">;
        subscription = await tx.community_bbs_community_subscriptions.create({
          data: {
            id: newId,
            community_id: community.id,
            community_member_id: communityMember.id,
            is_active: true,
            notification_level: body.notification_level,
            subscribed_at: now,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
        becameActive = true;
      }

      if (becameActive) {
        await tx.community_bbs_communities.update({
          where: { id: community.id },
          data: { members_count: { increment: 1 } },
        });

        await tx.community_bbs_notifications.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            recipient_id: communityMember.id,
            actor_id: null,
            target_type: "community",
            target_id: community.id,
            notification_key: `subscription:${community.id}`,
            notification_type: "subscription",
            channel: "in_app",
            priority: "medium",
            status: "pending",
            attempts: 0,
            suppressed: false,
            created_at: now,
            updated_at: now,
          },
        });
      }

      return subscription;
    });

    const [creatorRow, subscriberRow] = await Promise.all([
      MyGlobal.prisma.community_bbs_communitymember.findUnique({
        where: { id: community.creator_id },
      }),
      MyGlobal.prisma.community_bbs_communitymember.findUnique({
        where: { id: communityMember.id },
      }),
    ]);

    const subscriptionRow = result;

    const response: ICommunityBbsCommunitySubscription = {
      id: subscriptionRow.id,
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description ?? undefined,
        creator: {
          id: creatorRow!.id,
          username: creatorRow!.username,
          display_name: creatorRow!.display_name ?? undefined,
          karma: creatorRow!.karma,
          created_at: toISOStringSafe(creatorRow!.created_at),
          updated_at: toISOStringSafe(creatorRow!.updated_at),
        },
        visibility: community.visibility as "public" | "restricted" | "private",
        post_approval_required: community.post_approval_required,
        members_count: community.members_count as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        posts_count: community.posts_count as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
        community_settings: undefined,
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
        deleted_at: community.deleted_at
          ? toISOStringSafe(community.deleted_at)
          : undefined,
      },
      subscriber: {
        id: subscriberRow!.id,
        username: subscriberRow!.username,
        display_name: subscriberRow!.display_name ?? undefined,
        karma: subscriberRow!.karma as number & tags.Type<"int32">,
        created_at: toISOStringSafe(subscriberRow!.created_at),
        updated_at: toISOStringSafe(subscriberRow!.updated_at),
      },
      is_active: subscriptionRow.is_active,
      notification_level: typia.assert<"all" | "mentions" | "none">(
        subscriptionRow.notification_level,
      ),
      subscribed_at: subscriptionRow.subscribed_at
        ? toISOStringSafe(subscriptionRow.subscribed_at)
        : toISOStringSafe(new Date()),
      created_at: subscriptionRow.created_at
        ? toISOStringSafe(subscriptionRow.created_at)
        : toISOStringSafe(new Date()),
      updated_at: subscriptionRow.updated_at
        ? toISOStringSafe(subscriptionRow.updated_at)
        : toISOStringSafe(new Date()),
      deleted_at: subscriptionRow.deleted_at
        ? toISOStringSafe(subscriptionRow.deleted_at)
        : undefined,
    };

    return response;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Conflict", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
