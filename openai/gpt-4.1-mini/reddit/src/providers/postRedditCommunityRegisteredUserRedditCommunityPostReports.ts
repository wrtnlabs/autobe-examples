import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostReport";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityPostReports(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityPostReport.ICreate;
}): Promise<IRedditCommunityPostReport> {
  // Verify the referenced post exists and is not soft-deleted
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.body.post_id },
  });
  if (post === null) {
    throw new HttpException("Referenced post not found", 404);
  }

  // Create a new report record
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_post_reports.create({
    data: {
      id: v4(),
      reddit_community_post_id: props.body.post_id,
      reddit_community_registereduser_id: props.registeredUser.id,
      reddit_community_registereduser_session_id:
        props.registeredUser.session_id,
      reason: props.body.reason,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_community_post_id: created.reddit_community_post_id,
    reddit_community_registereduser_id:
      created.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      created.reddit_community_registereduser_session_id,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : created.deleted_at,
  };
}
