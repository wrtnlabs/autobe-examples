import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import { IPageIDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationPreference";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberNotificationPreferences(props: {
  member: MemberPayload;
  body: IDiscussionBoardNotificationPreference.IRequest;
}): Promise<IPageIDiscussionBoardNotificationPreference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition based on search criteria
  const where: Prisma.discussion_board_notification_preferencesWhereInput = {
    // Only show preferences for the authenticated member
    discussion_board_member_id: props.member.id,

    // Apply boolean filters
    ...(props.body.email_notifications !== undefined && {
      email_notifications: props.body.email_notifications,
    }),
    ...(props.body.in_app_notifications !== undefined && {
      in_app_notifications: props.body.in_app_notifications,
    }),
    ...(props.body.post_interactions !== undefined && {
      post_interactions: props.body.post_interactions,
    }),
    ...(props.body.comment_replies !== undefined && {
      comment_replies: props.body.comment_replies,
    }),
    ...(props.body.moderation_updates !== undefined && {
      moderation_updates: props.body.moderation_updates,
    }),
    ...(props.body.system_announcements !== undefined && {
      system_announcements: props.body.system_announcements,
    }),

    // Apply frequency filter
    ...(props.body.frequency && {
      frequency: props.body.frequency,
    }),

    // Apply date range filters using string comparison (no Date objects)
    ...(props.body.created_at_start && {
      created_at: {
        gte: props.body.created_at_start,
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: props.body.created_at_end,
      },
    }),
    ...(props.body.updated_at_start && {
      updated_at: {
        gte: props.body.updated_at_start,
      },
    }),
    ...(props.body.updated_at_end && {
      updated_at: {
        lte: props.body.updated_at_end,
      },
    }),
  };

  // Build orderBy based on sorting preference
  const orderBy: Prisma.discussion_board_notification_preferencesOrderByWithRelationInput =
    {};

  if (props.body.order_by === "created_at") {
    orderBy.created_at = props.body.order === "desc" ? "desc" : "asc";
  } else if (props.body.order_by === "updated_at") {
    orderBy.updated_at = props.body.order === "desc" ? "desc" : "asc";
  } else if (props.body.order_by === "member_name") {
    // Remove member_name ordering since 'name' field doesn't exist
    // Default to created_at ordering instead
    orderBy.created_at = props.body.order === "desc" ? "desc" : "asc";
  } else {
    // Default ordering
    orderBy.created_at = "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_notification_preferences.count({ where }),
  ]);

  // Get member information separately since relation may not exist
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: { id: true },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Transform results to match API contract
  const transformedData = data.map((preference) => ({
    id: preference.id,
    member: {
      id: member.id,
      type: "member",
      name: "Member", // Default name since actual name field doesn't exist
    },
    email_notifications: preference.email_notifications,
    in_app_notifications: preference.in_app_notifications,
    post_interactions: preference.post_interactions,
    comment_replies: preference.comment_replies,
    moderation_updates: preference.moderation_updates,
    system_announcements: preference.system_announcements,
    frequency: preference.frequency,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
