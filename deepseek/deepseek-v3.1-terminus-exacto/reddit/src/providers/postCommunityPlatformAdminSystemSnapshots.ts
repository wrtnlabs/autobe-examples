import { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSystemSnapshotCollector } from "../collectors/CommunityPlatformSystemSnapshotCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemSnapshotTransformer } from "../transformers/CommunityPlatformSystemSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminSystemSnapshots(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemSnapshot.ICreate;
}): Promise<ICommunityPlatformSystemSnapshot> {
  try {
    // Use the collector to transform the Create DTO to database input
    const createData = await CommunityPlatformSystemSnapshotCollector.collect({
      body: props.body,
    });
    // Create the system snapshot record
    const snapshot =
      await MyGlobal.prisma.community_platform_system_snapshots.create({
        data: createData,
        ...CommunityPlatformSystemSnapshotTransformer.select(),
      });
    // Transform the database record to response DTO
    return await CommunityPlatformSystemSnapshotTransformer.transform(snapshot);
  } catch (error) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new HttpException("Failed to create system snapshot", 500);
  }
}
