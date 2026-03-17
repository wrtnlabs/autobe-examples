import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityBanTransformer {
  export type Payload = Prisma.community_platform_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        reason: true,
        status: true,
        started_at: true,
        expired_at: true,
        lifted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBan> {
    return {
      id: input.id,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      reason: input.reason,
      status: input.status,
      started_at: input.started_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? null,
      lifted_at: input.lifted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
