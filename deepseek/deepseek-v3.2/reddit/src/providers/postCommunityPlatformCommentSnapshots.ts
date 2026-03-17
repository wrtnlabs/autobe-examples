import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentSnapshotCollector } from "../collectors/CommunityPlatformCommentSnapshotCollector";
import { CommunityPlatformCommentSnapshotTransformer } from "../transformers/CommunityPlatformCommentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformCommentSnapshots(props: {
  body: ICommunityPlatformCommentSnapshot.ICreate;
}): Promise<ICommunityPlatformCommentSnapshot> {
  // Validate comment exists
  const comment =
    await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
      where: { id: props.body.comment_id },
    });
  // Validate member exists if editor_id provided
  if (props.body.editor_id !== undefined && props.body.editor_id !== null) {
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.body.editor_id },
    });
  }
  // Validate status is allowed value
  if (!["created", "edited", "deleted"].includes(props.body.status)) {
    throw new HttpException(
      "Invalid status value. Must be one of: created, edited, deleted",
      400,
    );
  }
  // Create snapshot using Collector and Transformer
  const created =
    await MyGlobal.prisma.community_platform_comment_snapshots.create({
      data: await CommunityPlatformCommentSnapshotCollector.collect({
        body: props.body,
      }),
      ...CommunityPlatformCommentSnapshotTransformer.select(),
    });
  return await CommunityPlatformCommentSnapshotTransformer.transform(created);
}
