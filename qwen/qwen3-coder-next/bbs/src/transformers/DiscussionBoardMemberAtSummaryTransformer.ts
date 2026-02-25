import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberAtSummaryTransformer {
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
        is_active: true,
        is_admin: true,
        is_super_admin: true,
        created_at: true,
        updated_at: true,
        passwordResets: {
          select: { id: true } as const,
        } satisfies Prisma.discussion_board_member_password_resetsFindManyArgs,
        emailVerification: {
          select: { id: true } as const,
        } satisfies Prisma.discussion_board_member_email_verificationsFindManyArgs,
        sessions: {
          select: { id: true } as const,
        } satisfies Prisma.discussion_board_member_sessionsFindManyArgs,
        articles: {
          select: { id: true } as const,
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        comments: {
          select: { id: true } as const,
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      is_active: input.is_active,
      is_admin: input.is_admin,
      is_super_admin: input.is_super_admin,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
