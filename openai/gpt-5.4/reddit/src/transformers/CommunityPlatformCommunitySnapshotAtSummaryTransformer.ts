import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunitySnapshotAtSummaryTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot.ISummary> {
    return {
      id: input.id,
      visibility: input.visibility,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        visibility: true,
        created_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export type Payload = Prisma.community_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
}
