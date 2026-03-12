import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardBanRecordTransformer {
  export type Payload = Prisma.discussion_board_ban_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        ban_reason: true,
        banned_at: true,
        unbanned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedBy: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            grade: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.discussion_board_administratorsFindManyArgs,
        memberBanRecord: {
          select: {
            member: {
              select: {
                id: true,
                email: true,
                display_name: true,
                banned: true,
                created_at: true,
              },
            } satisfies Prisma.discussion_board_membersFindManyArgs,
          },
        } satisfies Prisma.discussion_board_ban_record_of_membersFindManyArgs,
        administratorBanRecord: {
          select: {
            administrator: {
              select: {
                id: true,
                email: true,
                display_name: true,
                bio: true,
                grade: true,
                created_at: true,
                updated_at: true,
              },
            } satisfies Prisma.discussion_board_administratorsFindManyArgs,
          },
        } satisfies Prisma.discussion_board_ban_record_of_administratorsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_ban_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardBanRecord> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      ban_reason: input.ban_reason,
      banned_at: input.banned_at.toISOString(),
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      bannedBy: {
        id: input.bannedBy.id,
        email: input.bannedBy.email,
        display_name: input.bannedBy.display_name ?? null,
        bio: input.bannedBy.bio ?? null,
        grade: input.bannedBy.grade,
        created_at: input.bannedBy.created_at.toISOString(),
        updated_at: input.bannedBy.updated_at.toISOString(),
      } satisfies IDiscussionBoardAdministrator.ISummary,
      bannedUser:
        input.actor_type === "member"
          ? ({
              id: input.memberBanRecord!.member.id,
              email: input.memberBanRecord!.member.email,
              display_name: input.memberBanRecord!.member.display_name ?? null,
              banned: input.memberBanRecord!.member.banned,
              created_at:
                input.memberBanRecord!.member.created_at.toISOString(),
            } satisfies IDiscussionBoardMember.ISummary)
          : ({
              id: input.administratorBanRecord!.administrator.id,
              email: input.administratorBanRecord!.administrator.email,
              display_name:
                input.administratorBanRecord!.administrator.display_name ??
                null,
              bio: input.administratorBanRecord!.administrator.bio ?? null,
              grade: input.administratorBanRecord!.administrator.grade,
              created_at:
                input.administratorBanRecord!.administrator.created_at.toISOString(),
              updated_at:
                input.administratorBanRecord!.administrator.updated_at.toISOString(),
            } satisfies IDiscussionBoardAdministrator.ISummary),
    };
  }
}
