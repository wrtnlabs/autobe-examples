import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityCommentReports(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityCommentReport.ICreate;
}): Promise<IRedditCommunityCommentReport> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_comment_reports.create(
    {
      data: {
        id: v4(),
        reason: props.body.reason,
        reddit_community_comment_id: props.body.reddit_community_comment_id,
        reddit_community_registereduser_id: props.registeredUser.id,
        reddit_community_registereduser_session_id:
          props.registeredUser.session_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
    reddit_community_comment_id: created.reddit_community_comment_id,
    reddit_community_registereduser_id:
      created.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      created.reddit_community_registereduser_session_id,
  };
}
