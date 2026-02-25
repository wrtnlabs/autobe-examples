import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunitySnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        icon: true,
        created_at: true,
        snapshot_reason: true,
        description: true,
        owner_id: true,
        community: true,
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      icon: input.icon ?? undefined,
      created_at: input.created_at.toISOString(),
      snapshot_reason: input.snapshot_reason ?? undefined,
    };
  }
}
