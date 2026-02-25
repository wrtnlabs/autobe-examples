import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberConfirmDeletion(props: {
  member: MemberPayload;
  body: IRedditPostText.IConfirmDeletion;
}): Promise<IRedditPostText.IConfirmResponse> {
  const post = await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: {
      id: props.body.post_id,
      deleted_at: null,
    },
  });
  if (post.reddit_members_id !== props.member.id) {
    throw new HttpException(
      "You cannot delete posts created by other users.",
      403,
    );
  }
  const postDate = new Date(post.created_at);
  const now = new Date();
  if (now.getTime() - postDate.getTime() > 48 * 60 * 60 * 1000) {
    throw new HttpException("Cannot delete posts more than 48 hours old.", 400);
  }
  const token = v4() as string & tags.Format<"uuid">;
  const validationWindow = toISOStringSafe(new Date(Date.now() + 3600000));
  await MyGlobal.prisma.reddit_moderation_logs.create({
    data: {
      actorId: props.member.id,
      target_post_id: props.body.post_id,
      action: "confirm_post_deletion",
      details: "Post deletion confirmation requested",
    },
  });
  return {
    status: "pending",
    token,
    validationWindow,
    nextSteps: ["Execute deletion using confirmation token"],
    validationConstraints: {
      ageLimit: 48,
      role: "member",
    },
  };
}
