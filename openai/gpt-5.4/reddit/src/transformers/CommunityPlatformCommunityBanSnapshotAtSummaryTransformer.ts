import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "./CommunityPlatformCommunityBanAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityBanSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.community_platform_community_ban_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        communityBan:
          CommunityPlatformCommunityBanAtSummaryTransformer.select(),
        createdByMember: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBanSnapshot.ISummary> {
    return {
      id: input.id,
      communityBan:
        await CommunityPlatformCommunityBanAtSummaryTransformer.transform(
          input.communityBan,
        ),
      createdByMember: input.createdByMember
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.createdByMember,
          )
        : null,
    };
  }
}
