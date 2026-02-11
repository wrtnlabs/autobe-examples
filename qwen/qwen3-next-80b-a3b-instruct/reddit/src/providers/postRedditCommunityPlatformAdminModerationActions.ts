import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityPlatformAdminModerationActions(props: {
  platformAdmin: PlatformadminPayload;
  body: IRedditCommunityModerationActionOfPost.ICreate;
}): Promise<void> {
  await MyGlobal.prisma.reddit_community_moderation_actions.create({
    data: {
      id: v4(),
      target_type: props.body.target_type,
      action_type: props.body.action_type,
      reason: props.body.reason,
      actor_id: props.platformAdmin.id,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
