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
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSystemNotificationOfAdminTransformer } from "./DiscussionBoardSystemNotificationOfAdminTransformer";
import { DiscussionBoardSystemNotificationOfMemberTransformer } from "./DiscussionBoardSystemNotificationOfMemberTransformer";
import { DiscussionBoardSystemNotificationOfSuperAdminTransformer } from "./DiscussionBoardSystemNotificationOfSuperAdminTransformer";

export namespace DiscussionBoardSystemNotificationAtSubtypeTransformer {
  export type Payload = Prisma.discussion_board_system_notificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        notificationOfMember:
          DiscussionBoardSystemNotificationOfMemberTransformer.select(),
        adminNotification:
          DiscussionBoardSystemNotificationOfAdminTransformer.select(),
        superAdminNotification:
          DiscussionBoardSystemNotificationOfSuperAdminTransformer.select(),
      },
    } satisfies Prisma.discussion_board_system_notificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotification.ISubtype> {
    let subtype: IDiscussionBoardSystemNotification.ISubtype["subtype"];
    if (input.notificationOfMember) {
      subtype =
        await DiscussionBoardSystemNotificationOfMemberTransformer.transform(
          input.notificationOfMember,
        );
    } else if (input.adminNotification) {
      subtype =
        await DiscussionBoardSystemNotificationOfAdminTransformer.transform(
          input.adminNotification,
        );
    } else if (input.superAdminNotification) {
      subtype =
        await DiscussionBoardSystemNotificationOfSuperAdminTransformer.transform(
          input.superAdminNotification,
        );
    } else {
      throw new Error("No subtype relation found for system notification");
    }
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      notification_type: input.notification_type,
      status: input.status,
      priority: input.priority,
      target_entity_type: input.target_entity_type ?? null,
      target_entity_id: input.target_entity_id ?? null,
      expires_at: input.expires_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      delivered_at: input.delivered_at?.toISOString() ?? null,
      read_at: input.read_at?.toISOString() ?? null,
      subtype,
    };
  }
}
