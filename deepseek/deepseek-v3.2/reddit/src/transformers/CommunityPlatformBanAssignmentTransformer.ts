import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformBanAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanAssignment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformBanAtSummaryTransformer } from "./CommunityPlatformBanAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

// Implement the missing transformer since the imported file is incomplete
export namespace CommunityPlatformBanAtSummaryTransformer {
  export type Payload = Prisma.community_platform_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        banned_at: true,
        expires_at: true,
        unbanned_at: true,
        active: true,
        bannedMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        issuingModeratorRole: {
          select: {
            member: CommunityPlatformMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.community_platform_moderation_rolesFindManyArgs,
      },
    } satisfies Prisma.community_platform_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      banned_at: input.banned_at.toISOString(),
      expires_at: input.expires_at?.toISOString() ?? null,
      unbanned_at: input.unbanned_at?.toISOString() ?? null,
      active: input.active,
      banned_member:
        await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.bannedMember,
        ),
      moderator: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.issuingModeratorRole.member,
      ),
    };
  }
}
export namespace CommunityPlatformBanAssignmentTransformer {
  export type Payload = Prisma.community_platform_ban_assignmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        assignment_reason_text: true,
        enforcement_notes: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ban: CommunityPlatformBanAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_ban_assignmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformBanAssignment> {
    return {
      id: input.id,
      assignment_reason_text: input.assignment_reason_text ?? undefined,
      enforcement_notes: input.enforcement_notes ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      ban: await CommunityPlatformBanAtSummaryTransformer.transform(input.ban),
    };
  }
}
