import { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityAdminMigrationHistoriesMigrationId(props: {
  admin: AdminPayload;
  migrationId: string;
  body: ICommunityMigrationHistory;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.community_migration_histories.findUnique({
      where: { id: props.migrationId },
    });
  if (!existing) {
    throw new HttpException("Migration history not found", 404);
  }
  // Verify that the applied_by_id corresponds to a real, active admin
  const targetAdmin = await MyGlobal.prisma.community_admins.findFirst({
    where: {
      id: props.body.applied_by_id,
      deleted_at: null,
    },
  });
  if (!targetAdmin) {
    throw new HttpException("Target admin does not exist or is deleted", 400);
  }
  // Verify uniqueness of version and patch_name combination
  const duplicate =
    await MyGlobal.prisma.community_migration_histories.findFirst({
      where: {
        id: { not: props.migrationId },
        version: props.body.version,
        patch_name: props.body.patch_name,
      },
    });
  if (duplicate) {
    throw new HttpException(
      "Version and patch_name combination must be unique",
      400,
    );
  }
  await MyGlobal.prisma.community_migration_histories.update({
    where: { id: props.migrationId },
    data: {
      applied_by_id: props.body.applied_by_id,
      target_version_id: props.body.target_version_id,
      version: props.body.version,
      patch_name: props.body.patch_name,
      applied_at: props.body.applied_at,
      status: props.body.status,
      description: props.body.description,
      checksum: props.body.checksum,
      duration_ms: props.body.duration_ms,
      rollback_script_hash: props.body.rollback_script_hash,
    },
  });
}
