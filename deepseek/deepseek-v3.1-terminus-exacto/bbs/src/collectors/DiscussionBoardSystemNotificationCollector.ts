import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemNotificationCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemNotification.ICreate;
  }) {
    const id: string = v4();
    return {
      // Primary key
      id,
      // Required scalar fields from DTO
      title: props.body.title,
      content: props.body.content,
      notification_type: props.body.notification_type,
      status: props.body.status,
      priority: props.body.priority,
      // Optional scalar fields from DTO
      target_entity_type: props.body.target_entity_type ?? null,
      target_entity_id: props.body.target_entity_id ?? null,
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : null,
      // Auto-generated timestamp fields
      created_at: new Date(),
      updated_at: new Date(),
      // Delivery status fields (initialize as null)
      delivered_at: null,
      read_at: null,
      // HasOne relations - not used in create operation
      notificationOfMember: undefined,
      adminNotification: undefined,
      superAdminNotification: undefined,
    } satisfies Prisma.discussion_board_system_notificationsCreateInput;
  }
}
