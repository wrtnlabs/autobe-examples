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
import { CommunityMigrationHistoryTransformer } from "../transformers/CommunityMigrationHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminMigrationHistoriesMigrationId(props: {
  admin: AdminPayload;
  migrationId: string & tags.Format<"uuid">;
}): Promise<ICommunityMigrationHistory> {
  const migration =
    await MyGlobal.prisma.community_migration_histories.findUnique({
      where: { id: props.migrationId },
      ...CommunityMigrationHistoryTransformer.select(),
    });
  if (!migration) {
    throw new HttpException("Migration not found", 404);
  }
  return await CommunityMigrationHistoryTransformer.transform(migration);
}
