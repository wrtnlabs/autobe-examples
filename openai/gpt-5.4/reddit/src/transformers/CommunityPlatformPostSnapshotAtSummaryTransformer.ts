import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        revision_no: true,
        visibility_state: true,
        created_at: true,
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
      },
    } satisfies Prisma.community_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostSnapshot.ISummary> {
    return {
      id: input.id,
      revision_no: input.revision_no,
      visibility_state: input.visibility_state,
      created_at: input.created_at.toISOString(),
    };
  }
}
