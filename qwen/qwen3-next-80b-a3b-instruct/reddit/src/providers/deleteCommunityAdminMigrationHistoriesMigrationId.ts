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

export async function deleteCommunityAdminMigrationHistoriesMigrationId(props: {
  admin: AdminPayload;
  migrationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.community_migration_histories.findUnique({
      where: { id: props.migrationId },
    });
  if (!existing) {
    throw new HttpException("Migration history not found", 404);
  }
  await MyGlobal.prisma.community_migration_histories.delete({
    where: { id: props.migrationId },
  });
}
