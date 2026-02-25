import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { ICommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostSnapshotTransformer } from "../transformers/CommunityPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostSnapshotsSnapshotId(props: {
  snapshotId: string;
}): Promise<ICommunityPostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_post_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...CommunityPostSnapshotTransformer.select(),
    });
  return await CommunityPostSnapshotTransformer.transform(snapshot);
}
