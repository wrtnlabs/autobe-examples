import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostSnapshotsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findUniqueOrThrow({
      where: { id: props.id },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
