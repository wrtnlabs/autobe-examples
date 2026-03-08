import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberTransformer {
  export type Payload = Prisma.discussion_board_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        role: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        memberPasswordResets: true,
        articles: true,
        administratorRequests: true,
        banRecords: true,
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      role: input.role as "guest" | "member" | "admin" | "superAdmin",
      is_banned: input.is_banned,
      ban_reason: input.ban_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
