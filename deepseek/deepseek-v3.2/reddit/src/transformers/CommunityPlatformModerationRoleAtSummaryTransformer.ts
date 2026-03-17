import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformModerationRoleAtSummaryTransformer {
  export type Payload = Prisma.community_platform_moderation_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: {
          select: { id: true, name: true },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
        assignedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        issuedBans: {
          select: { id: true },
        } satisfies Prisma.community_platform_bansFindManyArgs,
        reportDismissals: {
          select: { id: true },
        } satisfies Prisma.community_platform_user_report_dismissalsFindManyArgs,
      },
    } satisfies Prisma.community_platform_moderation_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationRole.ISummary> {
    return {
      id: input.id,
      roleType: input.role_type as "owner" | "moderator",
      createdAt: input.created_at.toISOString(),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      assignedBy: input.assignedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.assignedBy,
          )
        : null,
    };
  }
}
