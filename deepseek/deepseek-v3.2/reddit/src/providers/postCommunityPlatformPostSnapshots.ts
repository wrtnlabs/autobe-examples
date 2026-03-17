import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostSnapshotCollector } from "../collectors/CommunityPlatformPostSnapshotCollector";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformPostSnapshots(props: {
  body: ICommunityPlatformPostSnapshot.ICreate;
}): Promise<ICommunityPlatformPostSnapshot> {
  // First, verify the referenced post exists and is active (not soft-deleted)
  await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
    where: {
      id: props.body.community_platform_post_id,
      deleted_at: null, // Ensure post is active
    },
  });
  // Use Collector to create snapshot data
  const data = await CommunityPlatformPostSnapshotCollector.collect({
    body: props.body,
  });
  // Create the snapshot
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.create({
      data,
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  // Transform and return
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
