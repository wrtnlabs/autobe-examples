import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityModeratorModerationActions(props: {
  communityModerator: CommunitymoderatorPayload;
  body: IRedditCommunityModerationActionOfPost.ICreate;
}): Promise<void> {
  const created =
    await MyGlobal.prisma.reddit_community_moderation_actions.create({
      data: {
        id: v4(),
        actor_id: props.communityModerator.id,
        target_type: props.body.target_type,
        action_type: props.body.action_type,
        reason: props.body.reason,
        created_at: toISOStringSafe(new Date()),
      },
    });
}
