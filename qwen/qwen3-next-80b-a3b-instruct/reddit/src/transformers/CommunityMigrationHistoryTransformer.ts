import { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityMigrationHistoryTransformer {
  export type Payload = Prisma.community_migration_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        version: true,
        patch_name: true,
        applied_at: true,
        status: true,
        description: true,
        checksum: true,
        duration_ms: true,
        rollback_script_hash: true,
        appliedBy: {
          select: {
            id: true,
          },
        },
        targetVersion: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.community_migration_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMigrationHistory> {
    return {
      id: input.id,
      applied_by_id: input.appliedBy.id,
      target_version_id: input.targetVersion?.id ?? undefined,
      version: input.version,
      patch_name: input.patch_name,
      applied_at: toISOStringSafe(input.applied_at),
      status: typia.assert<"applied" | "failed" | "rolled_back">(input.status),
      description: input.description,
      checksum: input.checksum ?? undefined,
      duration_ms: input.duration_ms ?? undefined,
      rollback_script_hash: input.rollback_script_hash ?? undefined,
    };
  }
}
