import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommunityMembersUsernameSubscriptions(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsUserSubscription.ICreate;
}): Promise<ICommunityBbsUserSubscription> {
  const { communityMember, username, body } = props;

  // Resolve the target member by username
  const targetMember =
    await MyGlobal.prisma.community_bbs_communitymember.findUnique({
      where: { username: username },
    });
  if (!targetMember) throw new HttpException("Member not found", 404);

  // Authorization: only the owner can create their own subscriptions
  if (communityMember.id !== targetMember.id) {
    throw new HttpException(
      "Unauthorized: only the member may create their own subscriptions",
      403,
    );
  }

  // Validate member state
  if (
    targetMember.deleted_at !== null ||
    ["deleted_soft", "banned", "suspended"].includes(targetMember.status)
  ) {
    throw new HttpException("Member is not in active state", 400);
  }

  // Check target community exists and include creator and settings
  const community = await MyGlobal.prisma.community_bbs_communities.findUnique({
    where: { id: body.community_id },
    include: { creator: true, community_bbs_community_settings: true },
  });
  if (!community) throw new HttpException("Community not found", 404);

  // Validate member's notification preferences
  const prefs =
    await MyGlobal.prisma.community_bbs_notification_preferences.findUnique({
      where: { community_member_id: targetMember.id },
    });
  if (!prefs)
    throw new HttpException("Notification preferences not configured", 400);

  if (body.delivery_channel === "email" && !prefs.email) {
    throw new HttpException(
      "Delivery channel 'email' is not enabled for this member",
      400,
    );
  }
  if (body.delivery_channel === "in_app" && !prefs.in_app) {
    throw new HttpException(
      "Delivery channel 'in_app' is not enabled for this member",
      400,
    );
  }
  if (body.delivery_channel === "push" && !prefs.push) {
    throw new HttpException(
      "Delivery channel 'push' is not enabled for this member",
      400,
    );
  }

  // Search for existing subscription (unique constraint by community_id + community_member_id)
  const existing =
    await MyGlobal.prisma.community_bbs_user_subscriptions.findFirst({
      where: {
        community_id: body.community_id,
        community_member_id: targetMember.id,
      },
    });

  const now = toISOStringSafe(new Date());

  if (existing) {
    if (existing.deleted_at !== null) {
      const updated =
        await MyGlobal.prisma.community_bbs_user_subscriptions.update({
          where: { id: existing.id },
          data: {
            is_active: true,
            delivery_channel: body.delivery_channel,
            delivery_frequency: body.delivery_frequency,
            subscribed_at: now,
            deleted_at: null,
            updated_at: now,
          },
        });

      return {
        id: updated.id as string & tags.Format<"uuid">,
        community: {
          id: community.id as string & tags.Format<"uuid">,
          name: community.name,
          slug: community.slug,
          description: community.description ?? undefined,
          creator: {
            id: community.creator.id as string & tags.Format<"uuid">,
            username: community.creator.username,
            display_name: community.creator.display_name ?? undefined,
            karma: community.creator.karma,
            created_at: toISOStringSafe(community.creator.created_at),
            updated_at: toISOStringSafe(community.creator.updated_at),
          },
          visibility: community.visibility as
            | "public"
            | "restricted"
            | "private",
          post_approval_required: community.post_approval_required,
          members_count: Number(community.members_count),
          posts_count: Number(community.posts_count),
          community_settings: community.community_bbs_community_settings
            ? {
                community_id: community.community_bbs_community_settings
                  .community_id as string & tags.Format<"uuid">,
                visibility: typia.assert<
                  "public" | "restricted" | "private" | undefined
                >(
                  community.community_bbs_community_settings.visibility ??
                    undefined,
                ),
                require_post_approval:
                  community.community_bbs_community_settings
                    .require_post_approval ?? undefined,
                max_images_per_post:
                  community.community_bbs_community_settings
                    .max_images_per_post ?? null,
                allowed_image_mime_types: community
                  .community_bbs_community_settings.allowed_image_mime_types
                  ? community.community_bbs_community_settings.allowed_image_mime_types.split(
                      ",",
                    )
                  : undefined,
                created_at: toISOStringSafe(
                  community.community_bbs_community_settings.created_at,
                ),
                updated_at: toISOStringSafe(
                  community.community_bbs_community_settings.updated_at,
                ),
                deleted_at: community.community_bbs_community_settings
                  .deleted_at
                  ? toISOStringSafe(
                      community.community_bbs_community_settings.deleted_at,
                    )
                  : null,
              }
            : undefined,
          created_at: toISOStringSafe(community.created_at),
          updated_at: toISOStringSafe(community.updated_at),
          deleted_at: community.deleted_at
            ? toISOStringSafe(community.deleted_at)
            : null,
        },
        subscriber: {
          id: targetMember.id as string & tags.Format<"uuid">,
          username: targetMember.username,
          display_name: targetMember.display_name ?? undefined,
          karma: targetMember.karma,
          created_at: toISOStringSafe(targetMember.created_at),
          updated_at: toISOStringSafe(targetMember.updated_at),
        },
        delivery_channel: updated.delivery_channel as
          | "in_app"
          | "email"
          | "push",
        delivery_frequency: updated.delivery_frequency as
          | "immediate"
          | "hourly"
          | "daily",
        is_active: updated.is_active,
        subscribed_at: updated.subscribed_at
          ? toISOStringSafe(updated.subscribed_at)
          : now,
        created_at: updated.created_at
          ? toISOStringSafe(updated.created_at)
          : now,
        updated_at: updated.updated_at
          ? toISOStringSafe(updated.updated_at)
          : now,
        deleted_at: updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
      };
    }

    // Already active
    throw new HttpException("Subscription already exists", 409);
  }

  // Create new subscription
  const created = await MyGlobal.prisma.community_bbs_user_subscriptions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_id: body.community_id,
        community_member_id: targetMember.id,
        is_active: true,
        delivery_channel: body.delivery_channel,
        delivery_frequency: body.delivery_frequency,
        subscribed_at: now,
        created_at: now,
        updated_at: now,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    community: {
      id: community.id as string & tags.Format<"uuid">,
      name: community.name,
      slug: community.slug,
      description: community.description ?? undefined,
      creator: {
        id: community.creator.id as string & tags.Format<"uuid">,
        username: community.creator.username,
        display_name: community.creator.display_name ?? undefined,
        karma: community.creator.karma,
        created_at: toISOStringSafe(community.creator.created_at),
        updated_at: toISOStringSafe(community.creator.updated_at),
      },
      visibility: community.visibility as "public" | "restricted" | "private",
      post_approval_required: community.post_approval_required,
      members_count: Number(community.members_count),
      posts_count: Number(community.posts_count),
      community_settings: community.community_bbs_community_settings
        ? {
            community_id: community.community_bbs_community_settings
              .community_id as string & tags.Format<"uuid">,
            visibility: typia.assert<
              "public" | "restricted" | "private" | undefined
            >(
              community.community_bbs_community_settings.visibility ??
                undefined,
            ),
            require_post_approval:
              community.community_bbs_community_settings
                .require_post_approval ?? undefined,
            max_images_per_post:
              community.community_bbs_community_settings.max_images_per_post ??
              null,
            allowed_image_mime_types: community.community_bbs_community_settings
              .allowed_image_mime_types
              ? community.community_bbs_community_settings.allowed_image_mime_types.split(
                  ",",
                )
              : undefined,
            created_at: toISOStringSafe(
              community.community_bbs_community_settings.created_at,
            ),
            updated_at: toISOStringSafe(
              community.community_bbs_community_settings.updated_at,
            ),
            deleted_at: community.community_bbs_community_settings.deleted_at
              ? toISOStringSafe(
                  community.community_bbs_community_settings.deleted_at,
                )
              : null,
          }
        : undefined,
      created_at: toISOStringSafe(community.created_at),
      updated_at: toISOStringSafe(community.updated_at),
      deleted_at: community.deleted_at
        ? toISOStringSafe(community.deleted_at)
        : null,
    },
    subscriber: {
      id: targetMember.id as string & tags.Format<"uuid">,
      username: targetMember.username,
      display_name: targetMember.display_name ?? undefined,
      karma: targetMember.karma,
      created_at: toISOStringSafe(targetMember.created_at),
      updated_at: toISOStringSafe(targetMember.updated_at),
    },
    delivery_channel: created.delivery_channel as "in_app" | "email" | "push",
    delivery_frequency: created.delivery_frequency as
      | "immediate"
      | "hourly"
      | "daily",
    is_active: created.is_active,
    subscribed_at: created.subscribed_at
      ? toISOStringSafe(created.subscribed_at)
      : now,
    created_at: created.created_at ? toISOStringSafe(created.created_at) : now,
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : now,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
