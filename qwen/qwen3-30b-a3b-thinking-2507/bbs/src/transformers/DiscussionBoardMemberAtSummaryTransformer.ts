import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussion_board_member_sessions: true,
        discussion_board_articles: true,
        discussion_board_moderation_queue: true,
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember.ISummary> {
    return {
      id: input.id,
      username: input.name ?? "",
      name: input.name ?? "",
      avatar_url: "/default-avatar.png",
      created_at: input.created_at.toISOString(),
      status: input.status as "active" | "inactive" | "pending" | "banned",
    };
  }
}
