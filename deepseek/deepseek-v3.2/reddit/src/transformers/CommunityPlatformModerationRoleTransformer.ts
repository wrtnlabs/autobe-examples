import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformModerationRoleTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationRole> {
    return {
      id: input.id,
      roleType: input.role_type,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      assignedBy: input.assignedBy
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.assignedBy,
          )
        : null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        role_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        assignedBy: CommunityPlatformMemberAtSummaryTransformer.select(),
        issuedBans: false, // Required schema member, not used in DTO
        reportDismissals: false, // Required schema member, not used in DTO
      },
    } satisfies Prisma.community_platform_moderation_rolesFindManyArgs;
  }
  export type Payload = Prisma.community_platform_moderation_rolesGetPayload<
    ReturnType<typeof select>
  >;
}
