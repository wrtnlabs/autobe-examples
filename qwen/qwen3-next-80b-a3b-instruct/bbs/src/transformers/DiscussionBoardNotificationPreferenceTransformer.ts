import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardNotificationPreferenceTransformer {
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
  ): Promise<IDiscussionBoardNotificationPreference> {
    return {
      id: input.id,
      email: input.email_enabled ?? null,
      push: input.push_enabled ?? null,
      inApp: input.in_app_enabled ?? null,
      mention: null, // No field in database, but required by DTO
      reply: null, // No field in database, but required by DTO
      createdAt: input.created_at.toISOString(),
    };
  }
}
