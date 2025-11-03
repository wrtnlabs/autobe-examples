import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserSubscription";
import { IPageICommunityBbsUserSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function patchCommunityBbsCommunityMemberCommunityMembersUsernameSubscriptions(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsUserSubscription.IRequest;
}): Promise<IPageICommunityBbsUserSubscription.ISummary> {
  const { communityMember, username, body } = props;

  // Resolve target member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    { where: { username } },
  );
  if (!member) throw new HttpException("Not Found", 404);

  const isOwner = communityMember && communityMember.id === member.id;

  // Pagination params
  const limit = Number(body.limit ?? 25) as number;
  const page = body.cursor ? 0 : (Number(body.page ?? 0) as number);

  // Only owners may request archived rows
  const includeArchived = isOwner ? body.include_archived === true : false;

  // Build where condition
  const whereCondition = {
    community_member_id: member.id,
    ...(body.community_id !== undefined &&
      body.community_id !== null && { community_id: body.community_id }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.delivery_frequency !== undefined &&
      body.delivery_frequency !== null && {
        delivery_frequency: body.delivery_frequency,
      }),
    ...(includeArchived ? {} : { deleted_at: null }),
  };

  const orderBy =
    body.sort === "subscribed_at.asc"
      ? { subscribed_at: "asc" as const }
      : { subscribed_at: "desc" as const };

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.community_bbs_user_subscriptions.findMany({
        where: whereCondition,
        orderBy,
        ...(body.cursor
          ? { cursor: { id: body.cursor }, skip: 1, take: limit }
          : { skip: page * limit, take: limit }),
        include: {
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              visibility: true,
              post_approval_required: true,
              members_count: true,
              posts_count: true,
              created_at: true,
              updated_at: true,
              creator: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  karma: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              community_bbs_community_settings: {
                select: {
                  id: true,
                  community_id: true,
                  visibility: true,
                  require_post_approval: true,
                  max_images_per_post: true,
                  allowed_image_mime_types: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      }),
      MyGlobal.prisma.community_bbs_user_subscriptions.count({
        where: whereCondition,
      }),
    ]);

    const subscriberSummary = {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name: member.display_name ?? null,
      karma: Number(member.karma),
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    } satisfies ICommunityBbsCommunityMember.ISummary;

    const data = rows.map((r) => {
      const community = r.community!;

      const communitySettings = community.community_bbs_community_settings
        ? (() => {
            const src = community.community_bbs_community_settings;
            const allowed = src.allowed_image_mime_types;
            const normalizedAllowed: string[] | undefined = Array.isArray(
              allowed,
            )
              ? allowed
              : allowed != null
                ? [String(allowed)]
                : undefined;

            return {
              id: src.id as string & tags.Format<"uuid">,
              community_id: src.community_id as string & tags.Format<"uuid">,
              // Cast visibility string to expected literal union
              visibility: src.visibility as "public" | "restricted" | "private",
              require_post_approval: src.require_post_approval ?? null,
              max_images_per_post: src.max_images_per_post ?? null,
              allowed_image_mime_types: normalizedAllowed,
              created_at: src.created_at
                ? toISOStringSafe(src.created_at)
                : undefined,
              updated_at: src.updated_at
                ? toISOStringSafe(src.updated_at)
                : undefined,
              deleted_at: src.deleted_at
                ? toISOStringSafe(src.deleted_at)
                : null,
            };
          })()
        : undefined;

      const communitySummary = {
        id: community.id as string & tags.Format<"uuid">,
        name: community.name,
        slug: community.slug,
        description: community.description ?? null,
        creator: {
          id: community.creator.id as string & tags.Format<"uuid">,
          username: community.creator.username,
          display_name: community.creator.display_name ?? null,
          karma: Number(community.creator.karma),
          created_at: toISOStringSafe(community.creator.created_at),
          updated_at: toISOStringSafe(community.creator.updated_at),
        } satisfies ICommunityBbsCommunityMember.ISummary,
        // Cast visibility string to expected literal union
        visibility: community.visibility as "public" | "restricted" | "private",
        post_approval_required: community.post_approval_required,
        members_count: Number(community.members_count),
        posts_count: Number(community.posts_count),
        community_settings: communitySettings,
        created_at: toISOStringSafe(community.created_at),
        updated_at: toISOStringSafe(community.updated_at),
        deleted_at: undefined,
      } satisfies ICommunityBbsCommunity.ISummary;

      return {
        id: r.id as string & tags.Format<"uuid">,
        subscriber: subscriberSummary,
        community: communitySummary,
        is_active: r.is_active,
        delivery_channel: isOwner
          ? (r.delivery_channel as "in_app" | "email" | "push")
          : null,
        delivery_frequency: isOwner
          ? (r.delivery_frequency as "immediate" | "hourly" | "daily")
          : null,
        subscribed_at: r.subscribed_at
          ? toISOStringSafe(r.subscribed_at)
          : toISOStringSafe(r.created_at),
        created_at: toISOStringSafe(r.created_at),
        updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : null,
        deleted_at: r.deleted_at
          ? toISOStringSafe(r.deleted_at)
          : isOwner
            ? null
            : undefined,
      } satisfies ICommunityBbsUserSubscription.ISummary;
    });

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: Number(total),
        pages: Math.ceil(total / limit),
      },
      data,
    } satisfies IPageICommunityBbsUserSubscription.ISummary;
  } catch (e) {
    throw new HttpException("Internal Server Error", 500);
  }
}
