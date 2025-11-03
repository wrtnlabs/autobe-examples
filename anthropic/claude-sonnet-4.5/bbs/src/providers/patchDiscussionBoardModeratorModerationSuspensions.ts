import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationSuspensions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardUserSuspension.IRequest;
}): Promise<IPageIDiscussionBoardUserSuspension.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const now = toISOStringSafe(new Date());

  const where: Record<string, unknown> = {};

  if (
    body.discussion_board_member_id !== undefined &&
    body.discussion_board_member_id !== null
  ) {
    where.discussion_board_member_id = body.discussion_board_member_id;
  }

  if (
    body.suspending_moderator_id !== undefined &&
    body.suspending_moderator_id !== null
  ) {
    where.suspending_moderator_id = body.suspending_moderator_id;
  }

  if (body.status !== undefined && body.status !== null) {
    if (body.status === "active") {
      where.expires_at = { gt: now };
      where.lifted_at = null;
    } else if (body.status === "expired") {
      where.expires_at = { lte: now };
      where.lifted_at = null;
    } else if (body.status === "lifted") {
      where.lifted_at = { not: null };
    }
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.length > 0
  ) {
    where.OR = [
      { suspension_reason: { contains: body.search } },
      { suspension_details: { contains: body.search } },
    ];
  }

  const suspendedAtConditions: Record<string, unknown> = {};
  if (body.suspended_after !== undefined && body.suspended_after !== null) {
    suspendedAtConditions.gte = body.suspended_after;
  }
  if (body.suspended_before !== undefined && body.suspended_before !== null) {
    suspendedAtConditions.lte = body.suspended_before;
  }
  if (Object.keys(suspendedAtConditions).length > 0) {
    where.suspended_at = suspendedAtConditions;
  }

  const expiresAtConditions: Record<string, unknown> = {};
  if (body.expires_after !== undefined && body.expires_after !== null) {
    expiresAtConditions.gte = body.expires_after;
  }
  if (body.expires_before !== undefined && body.expires_before !== null) {
    expiresAtConditions.lte = body.expires_before;
  }
  if (Object.keys(expiresAtConditions).length > 0) {
    where.expires_at = expiresAtConditions;
  }

  const orderByField = body.order_by ?? "suspended_at";
  const orderDirection = body.order_direction ?? "desc";

  const [suspensions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_suspensions.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
      include: {
        suspendedUser: true,
        suspendingModerator: true,
        liftingModerator: true,
      },
    }),
    MyGlobal.prisma.discussion_board_user_suspensions.count({ where }),
  ]);

  const data = suspensions.map((suspension) => {
    return {
      id: suspension.id,
      suspended_user: {
        id: suspension.suspendedUser.id,
        username: suspension.suspendedUser.username,
        display_name: suspension.suspendedUser.display_name ?? null,
        profile_picture_url:
          suspension.suspendedUser.profile_picture_url ?? null,
      },
      suspension_reason: suspension.suspension_reason,
      suspended_at: toISOStringSafe(suspension.suspended_at),
      expires_at: suspension.expires_at
        ? toISOStringSafe(suspension.expires_at)
        : null,
      lifted_at: suspension.lifted_at
        ? toISOStringSafe(suspension.lifted_at)
        : undefined,
      created_at: toISOStringSafe(suspension.created_at),
      suspending_moderator: {
        id: suspension.suspendingModerator.id,
        username: suspension.suspendingModerator.username,
        display_name: suspension.suspendingModerator.display_name,
        profile_picture_url: suspension.suspendingModerator.profile_picture_url,
        email_verified: suspension.suspendingModerator.email_verified,
        status: suspension.suspendingModerator.status,
        moderation_permissions:
          suspension.suspendingModerator.moderation_permissions,
        profile_visibility: suspension.suspendingModerator.profile_visibility,
        activity_visibility: suspension.suspendingModerator.activity_visibility,
        bio: suspension.suspendingModerator.bio ?? null,
        location: suspension.suspendingModerator.location ?? null,
        website_url: suspension.suspendingModerator.website_url ?? null,
        last_login_at: suspension.suspendingModerator.last_login_at
          ? toISOStringSafe(suspension.suspendingModerator.last_login_at)
          : null,
        created_at: toISOStringSafe(suspension.suspendingModerator.created_at),
        updated_at: toISOStringSafe(suspension.suspendingModerator.updated_at),
        deleted_at: suspension.suspendingModerator.deleted_at
          ? toISOStringSafe(suspension.suspendingModerator.deleted_at)
          : null,
      },
      lifting_moderator: suspension.liftingModerator
        ? {
            id: suspension.liftingModerator.id,
            username: suspension.liftingModerator.username,
            display_name: suspension.liftingModerator.display_name,
            profile_picture_url:
              suspension.liftingModerator.profile_picture_url,
            email_verified: suspension.liftingModerator.email_verified,
            status: suspension.liftingModerator.status,
            moderation_permissions:
              suspension.liftingModerator.moderation_permissions,
            profile_visibility: suspension.liftingModerator.profile_visibility,
            activity_visibility:
              suspension.liftingModerator.activity_visibility,
            bio: suspension.liftingModerator.bio ?? null,
            location: suspension.liftingModerator.location ?? null,
            website_url: suspension.liftingModerator.website_url ?? null,
            last_login_at: suspension.liftingModerator.last_login_at
              ? toISOStringSafe(suspension.liftingModerator.last_login_at)
              : null,
            created_at: toISOStringSafe(suspension.liftingModerator.created_at),
            updated_at: toISOStringSafe(suspension.liftingModerator.updated_at),
            deleted_at: suspension.liftingModerator.deleted_at
              ? toISOStringSafe(suspension.liftingModerator.deleted_at)
              : null,
          }
        : undefined,
    };
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data,
  };
}
