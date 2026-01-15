import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserAtUpdateSummaryTransformer {
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
  ): Promise<IDiscussionBoardUser.IUpdateSummary> {
    return {
      emailNotification: input.email_enabled,
      pushNotification: input.push_enabled,
      inAppNotification: input.in_app_enabled,
      digestFrequency: "never", // Default value since no digest_frequency field exists in database, but required by DTO
    };
  }
}
