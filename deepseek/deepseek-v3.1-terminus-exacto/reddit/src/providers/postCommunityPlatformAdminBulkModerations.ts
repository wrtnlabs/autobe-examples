import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModerationQueueCollector } from "../collectors/CommunityPlatformModerationQueueCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationQueueTransformer } from "../transformers/CommunityPlatformModerationQueueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminBulkModerations(props: {
  admin: AdminPayload;
  body: ICommunityPlatformModerationQueue.ICreate;
}): Promise<ICommunityPlatformModerationQueue> {
  // Validate that at least one content reference is provided
  if (
    !props.body.community_platform_post_id &&
    !props.body.community_platform_comment_id
  ) {
    throw new HttpException(
      "Either community_platform_post_id or community_platform_comment_id must be provided",
      400,
    );
  }
  // Validate that only one content reference is provided (not both)
  if (
    props.body.community_platform_post_id &&
    props.body.community_platform_comment_id
  ) {
    throw new HttpException(
      "Cannot specify both community_platform_post_id and community_platform_comment_id",
      400,
    );
  }
  // Use collector to transform DTO to database input
  const data = await CommunityPlatformModerationQueueCollector.collect({
    body: props.body,
  });
  // Create the moderation queue record
  const moderationQueue =
    await MyGlobal.prisma.community_platform_moderation_queues.create({
      data,
      ...CommunityPlatformModerationQueueTransformer.select(),
    });
  // Transform database record to API response
  return await CommunityPlatformModerationQueueTransformer.transform(
    moderationQueue,
  );
}
