import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreferences";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationPreferencesTransformer {
  export type Payload =
    Prisma.discussion_board_notification_preferencesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        email_enabled: true,
        push_enabled: true,
        in_app_enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        citizen: true,
        moderator: true,
      },
    } satisfies Prisma.discussion_board_notification_preferencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardNotificationPreferences> {
    return {
      emailNotifications: input.email_enabled,
      pushNotifications: input.push_enabled,
      inAppNotifications: input.in_app_enabled,
      commentReplies: false,
      articlePublicationStatus: false,
      moderatorActions: false,
      systemAlerts: false,
    };
  }
}
