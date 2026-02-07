import { ICommunityMigrationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMigrationHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityMigrationHistoryCollector } from "../collectors/CommunityMigrationHistoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityMigrationHistoryTransformer } from "../transformers/CommunityMigrationHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminMigrationHistories(props: {
  admin: AdminPayload;
  body: ICommunityMigrationHistory.ICreate;
}): Promise<ICommunityMigrationHistory> {
  const created = await MyGlobal.prisma.community_migration_histories.create({
    data: await CommunityMigrationHistoryCollector.collect({
      body: props.body,
      admin: props.admin,
    }),
    ...CommunityMigrationHistoryTransformer.select(),
  });
  return await CommunityMigrationHistoryTransformer.transform(created);
}
