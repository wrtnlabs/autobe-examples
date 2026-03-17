import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorOwner";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityModeratorAtSummaryTransformer } from "./CommunityPlatformCommunityModeratorAtSummaryTransformer";

export namespace CommunityPlatformCommunityModeratorOwnerTransformer {
  export type Payload =
    Prisma.community_platform_community_moderator_ownersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        communityModerator:
          CommunityPlatformCommunityModeratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_moderator_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityModeratorOwner> {
    return {
      id: input.id,
      communityModerator:
        await CommunityPlatformCommunityModeratorAtSummaryTransformer.transform(
          input.communityModerator,
        ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
