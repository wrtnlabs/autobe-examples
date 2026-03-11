import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IDiscussionBoardSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotification";
import { IDiscussionBoardSystemNotificationOfSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotificationOfSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminSessionAtSummaryTransformer } from "./DiscussionBoardSuperAdminSessionAtSummaryTransformer";
import { DiscussionBoardSystemNotificationAtSummaryTransformer } from "./DiscussionBoardSystemNotificationAtSummaryTransformer";

export namespace DiscussionBoardSystemNotificationOfSuperAdminTransformer {
  export type Payload =
    Prisma.discussion_board_system_notification_of_super_adminsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        systemNotification:
          DiscussionBoardSystemNotificationAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        superAdminSession:
          DiscussionBoardSuperAdminSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_system_notification_of_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemNotificationOfSuperAdmin> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      systemNotification:
        await DiscussionBoardSystemNotificationAtSummaryTransformer.transform(
          input.systemNotification,
        ),
      superAdmin: await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      superAdminSession: input.superAdminSession
        ? await DiscussionBoardSuperAdminSessionAtSummaryTransformer.transform(
            input.superAdminSession,
          )
        : null,
    };
  }
}
