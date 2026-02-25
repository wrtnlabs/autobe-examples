import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardSuperAdminSessionTransformer {
  export type Payload = Prisma.discussion_board_super_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        user_agent: true,
        referrer: true,
        active: true,
        created_at: true,
        expired_at: true,
        updated_at: true,
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_super_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdminSession> {
    return {
      id: input.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      user_agent: input.user_agent ?? undefined,
      referrer: input.referrer ?? undefined,
      active: input.active,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      superAdmin: await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
    };
  }
}
