import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardUserBanTransformer {
  export type Payload = Prisma.discussion_board_user_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        banned_at: true,
        expires_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        administrativeHistories: true,
      },
    } satisfies Prisma.discussion_board_user_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserBan> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      banned_at: input.banned_at.toISOString(),
      expires_at: input.expires_at?.toISOString() ?? null,
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: input.member
        ? await DiscussionBoardMemberAtSummaryTransformer.transform(
            input.member,
          )
        : undefined,
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : undefined,
    };
  }
}
