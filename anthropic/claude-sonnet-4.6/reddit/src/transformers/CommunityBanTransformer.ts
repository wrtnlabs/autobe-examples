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
        reason: true,
        status: true,
        lifted_at: true,
        created_at: true,
        updated_at: true,
        community: CommunityCommunityAtSummaryTransformer.select(),
        bannedMember: CommunityMemberAtSummaryTransformer.select(),
        issuingModerator: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_bansFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityBan> {
    return {
      id: input.id,
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      bannedMember: await CommunityMemberAtSummaryTransformer.transform(
        input.bannedMember,
      ),
      issuingModerator: await CommunityMemberAtSummaryTransformer.transform(
        input.issuingModerator,
      ),
      reason: input.reason,
      status: input.status,
      lifted_at: input.lifted_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
