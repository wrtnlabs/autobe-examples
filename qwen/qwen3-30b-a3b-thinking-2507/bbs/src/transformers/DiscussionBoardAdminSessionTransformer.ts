import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardAdminSessionTransformer {
  export type Payload = Prisma.discussion_board_admin_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminSession> {
    return {
      id: input.id,
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      status: input.expired_at
        ? input.expired_at > new Date()
          ? "active"
          : "revoked"
        : "inactive",
      last_activity_at: input.created_at.toISOString(),
      expiration: input.expired_at
        ? input.expired_at.toISOString()
        : new Date("2300-01-01").toISOString(),
    };
  }
}
