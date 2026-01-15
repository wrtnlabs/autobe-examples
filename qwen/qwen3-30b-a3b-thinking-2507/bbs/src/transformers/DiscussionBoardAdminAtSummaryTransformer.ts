import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        system_access_level: true,
        moderation_capabilities: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussion_board_admin_sessions: true,
      },
    } satisfies Prisma.discussion_board_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdmin.ISummary> {
    return {
      id: input.id,
      name: input.email,
      email: input.email,
      role: input.system_access_level,
      created_at: input.created_at.toISOString(),
    };
  }
}
