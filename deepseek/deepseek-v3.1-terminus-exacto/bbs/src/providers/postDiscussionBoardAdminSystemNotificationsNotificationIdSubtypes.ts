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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemNotificationsNotificationIdSubtypes(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemNotification.ICreateSubtype;
}): Promise<IDiscussionBoardSystemNotification.ISubtype> {
  // 1. Verify parent notification exists
  const parentNotification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
      },
    );
  // 2. Check if subtype already exists for this notification
  const existingSubtypeCheck = await MyGlobal.prisma.$queryRaw<
    Array<{
      id: string;
    }>
  >`
    SELECT id FROM discussion_board_system_notification_of_admins WHERE discussion_board_system_notification_id = ${props.notificationId}
    UNION
    SELECT id FROM discussion_board_system_notification_of_members WHERE discussion_board_system_notification_id = ${props.notificationId}
    UNION
    SELECT id FROM discussion_board_system_notification_of_super_admins WHERE discussion_board_system_notification_id = ${props.notificationId}
    LIMIT 1
  `;
  if (existingSubtypeCheck.length > 0) {
    throw new HttpException(
      "Notification subtype already exists for this notification",
      400,
    );
  }
  // 3. Create subtype based on actor_type
  let createdSubtypeId: string;
  if (props.body.actor_type === "admin") {
    // Validate admin exists
    const admin =
      await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
        where: { id: props.body.admin_id },
      });
    const subtype =
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
    createdSubtypeId = subtype.id;
  } else if (props.body.actor_type === "member") {
    // Validate member exists
    const member =
      await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
        where: { id: props.body.member_id },
      });
    const subtype =
      await MyGlobal.prisma.discussion_board_system_notification_of_members.create(
        {
          data: {
            id: v4(),
            discussion_board_system_notification_id: props.notificationId,
            discussion_board_member_id: props.body.member_id,
            is_read: false, // default
            read_at: null,
            acknowledged_at: null,
            notification_preferences: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        },
      );
    createdSubtypeId = subtype.id;
  } else {
    // superAdmin
    // Validate superAdmin exists
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
        where: { id: props.body.super_admin_id },
      });
    const subtype =
      await MyGlobal.prisma.discussion_board_system_notification_of_super_admins.create(
        {
          data: {
            id: v4(),
            discussion_board_system_notification_id: props.notificationId,
            discussion_board_super_admin_id: props.body.super_admin_id,
            discussion_board_super_admin_session_id: null, // session_context not implemented in schema
            created_at: new Date(),
            updated_at: new Date(),
          },
        },
      );
    createdSubtypeId = subtype.id;
  }
  // 4. Fetch complete notification with subtype relation
  const completeNotification =
    await MyGlobal.prisma.discussion_board_system_notifications.findUniqueOrThrow(
      {
        where: { id: props.notificationId },
        select: {
          id: true,
          title: true,
          content: true,
          notification_type: true,
          status: true,
          priority: true,
          target_entity_type: true,
          target_entity_id: true,
          expires_at: true,
          created_at: true,
          updated_at: true,
          delivered_at: true,
          read_at: true,
          notificationOfMember: {
            select: {
              id: true,
              is_read: true,
              read_at: true,
              acknowledged_at: true,
              notification_preferences: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              member: {
                select: {
                  id: true,
                  display_name: true,
                  bio: true,
                },
              },
            },
          },
          adminNotification: {
            select: {
              id: true,
              notification_context: true,
              created_at: true,
              updated_at: true,
              admin: {
                select: {
                  id: true,
                  email: true,
                  admin_grade: true,
                },
              },
            },
          },
          superAdminNotification: {
            select: {
              id: true,
              created_at: true,
              updated_at: true,
              superAdmin: {
                select: {
                  id: true,
                  email: true,
                  admin_grade: true,
                  created_at: true,
                  updated_at: true,
                },
              },
              superAdminSession: {
                select: {
                  id: true,
                  ip: true,
                  created_at: true,
                  expired_at: true,
                },
              },
            },
          },
        },
      },
    );
  // 5. Transform to DTO
  let subtypeResponse: IDiscussionBoardSystemNotification.ISubtype["subtype"];
  if (completeNotification.notificationOfMember) {
    subtypeResponse = {
      id: completeNotification.notificationOfMember.id,
      is_read: completeNotification.notificationOfMember.is_read,
      read_at:
        completeNotification.notificationOfMember.read_at?.toISOString() ??
        null,
      acknowledged_at:
        completeNotification.notificationOfMember.acknowledged_at?.toISOString() ??
        null,
      notification_preferences:
        completeNotification.notificationOfMember.notification_preferences,
      created_at:
        completeNotification.notificationOfMember.created_at.toISOString(),
      updated_at:
        completeNotification.notificationOfMember.updated_at.toISOString(),
      deleted_at:
        completeNotification.notificationOfMember.deleted_at?.toISOString() ??
        null,
      systemNotification: {
        id: completeNotification.id,
        title: completeNotification.title,
        notification_type: completeNotification.notification_type,
        status: completeNotification.status,
        priority: completeNotification.priority,
        created_at: completeNotification.created_at.toISOString(),
        delivered_at: completeNotification.delivered_at?.toISOString() ?? null,
        read_at: completeNotification.read_at?.toISOString() ?? null,
      } satisfies IDiscussionBoardSystemNotification.ISummary,
      member: {
        id: completeNotification.notificationOfMember.member.id,
        display_name:
          completeNotification.notificationOfMember.member.display_name,
        bio: completeNotification.notificationOfMember.member.bio ?? null,
      } satisfies IDiscussionBoardMember.ISummary,
    };
  } else if (completeNotification.adminNotification) {
    subtypeResponse = {
      id: completeNotification.adminNotification.id,
      notification_context:
        completeNotification.adminNotification.notification_context,
      created_at:
        completeNotification.adminNotification.created_at.toISOString(),
      updated_at:
        completeNotification.adminNotification.updated_at.toISOString(),
      systemNotification: {
        id: completeNotification.id,
        title: completeNotification.title,
        notification_type: completeNotification.notification_type,
        status: completeNotification.status,
        priority: completeNotification.priority,
        created_at: completeNotification.created_at.toISOString(),
        delivered_at: completeNotification.delivered_at?.toISOString() ?? null,
        read_at: completeNotification.read_at?.toISOString() ?? null,
      } satisfies IDiscussionBoardSystemNotification.ISummary,
      admin: {
        id: completeNotification.adminNotification.admin.id,
        email: completeNotification.adminNotification.admin.email as string &
          tags.Format<"email">,
        admin_grade: completeNotification.adminNotification.admin.admin_grade,
      } satisfies IDiscussionBoardAdmin.ISummary,
    };
  } else if (completeNotification.superAdminNotification) {
    subtypeResponse = {
      id: completeNotification.superAdminNotification.id,
      created_at:
        completeNotification.superAdminNotification.created_at.toISOString(),
      updated_at:
        completeNotification.superAdminNotification.updated_at.toISOString(),
      systemNotification: {
        id: completeNotification.id,
        title: completeNotification.title,
        notification_type: completeNotification.notification_type,
        status: completeNotification.status,
        priority: completeNotification.priority,
        created_at: completeNotification.created_at.toISOString(),
        delivered_at: completeNotification.delivered_at?.toISOString() ?? null,
        read_at: completeNotification.read_at?.toISOString() ?? null,
      } satisfies IDiscussionBoardSystemNotification.ISummary,
      superAdmin: {
        id: completeNotification.superAdminNotification.superAdmin.id,
        email: completeNotification.superAdminNotification.superAdmin
          .email as string & tags.Format<"email">,
        admin_grade:
          completeNotification.superAdminNotification.superAdmin.admin_grade,
        created_at:
          completeNotification.superAdminNotification.superAdmin.created_at.toISOString(),
        updated_at:
          completeNotification.superAdminNotification.superAdmin.updated_at.toISOString(),
      } satisfies IDiscussionBoardSuperAdmin.ISummary,
      superAdminSession: completeNotification.superAdminNotification
        .superAdminSession
        ? ({
            id: completeNotification.superAdminNotification.superAdminSession
              .id,
            ip: completeNotification.superAdminNotification.superAdminSession
              .ip as string & tags.Format<"ipv4">,
            created_at:
              completeNotification.superAdminNotification.superAdminSession.created_at.toISOString(),
            expired_at:
              completeNotification.superAdminNotification.superAdminSession.expired_at.toISOString(),
          } satisfies IDiscussionBoardSuperAdminSession.ISummary)
        : null,
    };
  } else {
    throw new Error("No subtype created");
  }
  // 6. Return complete notification with subtype
  return {
    id: completeNotification.id,
    title: completeNotification.title,
    content: completeNotification.content,
    notification_type: completeNotification.notification_type,
    status: completeNotification.status,
    priority: completeNotification.priority,
    target_entity_type: completeNotification.target_entity_type ?? null,
    target_entity_id: completeNotification.target_entity_id ?? null,
    expires_at: completeNotification.expires_at?.toISOString() ?? null,
    created_at: completeNotification.created_at.toISOString(),
    updated_at: completeNotification.updated_at.toISOString(),
    delivered_at: completeNotification.delivered_at?.toISOString() ?? null,
    read_at: completeNotification.read_at?.toISOString() ?? null,
    subtype: subtypeResponse,
  };
}
