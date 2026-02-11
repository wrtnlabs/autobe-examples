import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityBannedUserAtSummaryTransformer {
  export type Payload = Prisma.community_banned_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        banned_at: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedUser: CommunityMemberAtSummaryTransformer.select(),
        bannedCommunity: CommunityCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_banned_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityBannedUser.ISummary> {
    return {
      id: input.id,
      banned_at: toISOStringSafe(input.banned_at),
      reason: input.reason ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      bannedUser: await CommunityMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      bannedCommunity: await CommunityCommunityAtSummaryTransformer.transform(
        input.bannedCommunity,
      ),
    };
  }
}
