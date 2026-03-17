import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityModeratorAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_moderatorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        grantedByMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        revokedByMember: CommunityPlatformMemberAtSummaryTransformer.select(),
        role: true,
        status: true,
        granted_at: true,
        revoked_at: true,
        revocation_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityModerator.ISummary> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      grantedByMember:
        await CommunityPlatformMemberAtSummaryTransformer.transform(
          input.grantedByMember,
        ),
      revokedByMember: input.revokedByMember
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.revokedByMember,
          )
        : null,
      role: input.role,
      status: input.status,
      granted_at: input.granted_at.toISOString(),
      revoked_at: input.revoked_at?.toISOString() ?? null,
      revocation_reason: input.revocation_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
