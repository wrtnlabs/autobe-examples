import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityBanAtSummaryTransformer {
  export type Payload = Prisma.community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        expired_at: true,
        created_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        bannedBy: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityBan.ISummary> {
    return {
      id: input.id,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      bannedBy: await CommunityMemberAtSummaryTransformer.transform(
        input.bannedBy,
      ),
      reason: input.reason,
      expiredAt: input.expired_at ? input.expired_at.toISOString() : null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
