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
        ban_status: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberSessions: true,
        passwordResets: true,
        emailVerifications: true,
        auditLogs: true,
        articles: true,
        comments: true,
        adminRequests: true,
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
      displayName: input.display_name,
      bio: input.bio ?? undefined,
      banStatus: input.ban_status,
      banReason: input.ban_reason ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
