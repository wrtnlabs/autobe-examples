import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "./CommunityPlatformCommunityModeratorAtSummaryTransformer";

export namespace CommunityPlatformCommunityModeratorSnapshotAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityModeratorSnapshot.ISummary> {
    return {
      id: input.id,
      communityModerator:
        await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
          input.communityModerator,
        ),
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        communityModerator:
          CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
        created_at: true,
      },
    } satisfies Prisma.community_platform_community_moderator_snapshotsFindManyArgs;
  }
  export type Payload =
    Prisma.community_platform_community_moderator_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
}
