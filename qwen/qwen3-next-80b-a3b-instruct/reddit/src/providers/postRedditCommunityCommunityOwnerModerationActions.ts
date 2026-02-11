import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityCommunityOwnerModerationActions(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityModerationActionOfPost.ICreate;
}): Promise<void> {
  const id = v4();
  const created =
    await MyGlobal.prisma.reddit_community_moderation_actions.create({
      data: {
        id,
        actor_id: props.communityOwner.id,
        target_type: props.body.target_type,
        action_type: props.body.action_type,
        reason: props.body.reason,
        created_at: toISOStringSafe(new Date()),
      },
      select: { id: true },
    });
  if (props.body.target_type === "post") {
    throw new HttpException(
      "Post moderation not supported via this endpoint",
      400,
    );
  } else if (props.body.target_type === "comment") {
    throw new HttpException(
      "Comment moderation requires comment_id in request",
      400,
    );
  }
}
