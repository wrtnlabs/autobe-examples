import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IDiscussionBoardSystemNotificationOfAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfAdmin";
import { IDiscussionBoardSystemNotificationOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfMember";
import { IDiscussionBoardSystemNotificationOfSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemNotificationAtSubtypeTransformer } from "../transformers/DiscussionBoardSystemNotificationAtSubtypeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemNotificationsNotificationIdSubtypes(props: {
  superAdmin: SuperadminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.ICreateSubtype;
}): Promise<IDiscussionBoardSystemNotification.ISubtype> {
  // Step 1: Verify parent notification exists
  const parentNotification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUnique({
      where: { id: props.notificationId },
    });
  if (!parentNotification) {
    throw new HttpException("Notification not found", 404);
  }
  // Step 2: Enforce 1:1 constraint - check existing subtype
  const existingSubtype =
    await MyGlobal.prisma.discussion_board_system_notifications.findUnique({
      where: { id: props.notificationId },
      select: {
        notificationOfMember: {
          select: { id: true },
        },
        adminNotification: {
          select: { id: true },
        },
        superAdminNotification: {
          select: { id: true },
        },
      },
    });
  // At most one should exist due to DB constraints, but check anyway
  const hasExisting =
    !!existingSubtype?.notificationOfMember ||
    !!existingSubtype?.adminNotification ||
    !!existingSubtype?.superAdminNotification;
  if (hasExisting) {
    throw new HttpException(
      "Notification already has a subtype association",
      409,
    );
  }
  // Step 3: Actor validation and subtype creation based on discriminator
  if (props.body.actor_type === "admin") {
    // Validate admin exists
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.admin_id },
    });
    if (!admin) {
      throw new HttpException("Admin not found", 404);
    }
    // Create admin subtype
    const adminSubtype =
      await MyGlobal.prisma.discussion_board_system_notification_of_admins.create(
        {
          data: {
            id: v4(),
            discussion_board_system_notification_id: props.notificationId,
            discussion_board_admin_id: props.body.admin_id,
            notification_context: props.body.notification_context ?? null,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
  } else if (props.body.actor_type === "member") {
    // Validate member exists
    const member = await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: props.body.member_id },
    });
    if (!member) {
      throw new HttpException("Member not found", 404);
    }
    // Create member subtype with default read status
    const memberSubtype =
      await MyGlobal.prisma.discussion_board_system_notification_of_members.create(
        {
          data: {
            id: v4(),
            discussion_board_system_notification_id: props.notificationId,
            discussion_board_member_id: props.body.member_id,
            is_read: false,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        },
      );
  } else if (props.body.actor_type === "superAdmin") {
    // Validate super admin exists
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUnique({
        where: { id: props.body.super_admin_id },
      });
    if (!superAdmin) {
      throw new HttpException("Super admin not found", 404);
    }
    // Optional session context validation
    let superAdminSessionId: string | null = null;
    if (props.body.session_context) {
      const session =
        await MyGlobal.prisma.discussion_board_super_admin_sessions.findUnique({
          where: { id: props.body.session_context },
        });
      if (!session) {
        throw new HttpException("Super admin session not found", 404);
      }
      superAdminSessionId = props.body.session_context;
    }
    // Create super admin subtype
    const superAdminSubtype =
      await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.create(
        {
          data: {
            id: v4(),
            discussion_board_system_notification_id: props.notificationId,
            discussion_board_super_admin_id: props.body.super_admin_id,
            discussion_board_super_admin_session_id: superAdminSessionId,
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
  } else {
    throw new HttpException("Invalid actor type", 400);
  }
  // Step 4: Retrieve complete subtype with transformers
  const notificationWithSubtype =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        ...DiscussionBoardSystemNotificationAtSubtypeTransformer.select(),
      },
    );
  return await DiscussionBoardSystemNotificationAtSubtypeTransformer.transform(
    notificationWithSubtype,
  );
}
