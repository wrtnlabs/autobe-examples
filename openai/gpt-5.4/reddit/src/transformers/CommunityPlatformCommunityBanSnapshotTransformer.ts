import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityBanTransformer } from "./CommunityPlatformCommunityBanTransformer";
import { CommunityPlatformMemberTransformer } from "./CommunityPlatformMemberTransformer";

export namespace CommunityPlatformCommunityBanSnapshotTransformer {
  export type Payload =
    Prisma.community_platform_community_ban_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        communityBan: CommunityPlatformCommunityBanTransformer.select(),
        createdByMember: CommunityPlatformMemberTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_ban_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBanSnapshot> {
    return {
      id: input.id,
      communityBan: await CommunityPlatformCommunityBanTransformer.transform(
        input.communityBan,
      ),
      createdByMember: input.createdByMember
        ? await CommunityPlatformMemberTransformer.transform(
            input.createdByMember,
          )
        : null,
    };
  }
}
