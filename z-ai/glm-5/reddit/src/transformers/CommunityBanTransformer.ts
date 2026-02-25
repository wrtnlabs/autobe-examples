import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityBanTransformer {
  export type Payload = Prisma.community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community: CommunityCommunityAtSummaryTransformer.select(),
        member: CommunityMemberAtSummaryTransformer.select(),
        bannedBy: CommunityMemberAtSummaryTransformer.select(),
        reason: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_bansFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityBan> {
    return {
      id: input.id,
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      bannedBy: await CommunityMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      reason: input.reason,
      expiredAt: input.expired_at ? input.expired_at.toISOString() : null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
