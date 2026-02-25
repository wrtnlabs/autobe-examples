import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunitySnapshotTransformer {
  export type Payload = Prisma.community_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        created_at: true,
        snapshot_reason: true,
        community: {
          select: {
            owner: CommunityPlatformUserAtSummaryTransformer.select(),
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      icon: input.icon ?? undefined,
      owner: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.community.owner,
      ),
      created_at: input.created_at.toISOString(),
      snapshot_reason: input.snapshot_reason ?? null,
    };
  }
}
