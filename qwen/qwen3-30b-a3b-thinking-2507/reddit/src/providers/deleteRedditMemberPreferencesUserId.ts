import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteRedditMemberPreferencesUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.member.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_feed_preferences.update({
    where: {
      user_id: props.userId,
      deleted_at: null,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.reddit_moderation_logs.create({
    data: {
      id: v4(),
      moderator: { connect: { id: props.member.id } },
      action_type: "feed_preference_delete",
      result: "success",
      created_at: toISOStringSafe(new Date()),
      details: "User feed preference deleted",
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
