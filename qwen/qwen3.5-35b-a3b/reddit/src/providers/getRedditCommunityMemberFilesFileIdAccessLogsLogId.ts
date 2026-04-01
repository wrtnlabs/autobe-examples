import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileAccessLogTransformer } from "../transformers/RedditCommunityFileAccessLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberFilesFileIdAccessLogsLogId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileAccessLog> {
  // Verify file exists
  await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: { id: props.fileId },
  });
  // Query the access log entry, ensuring it belongs to the specified file
  const accessLog =
    await MyGlobal.prisma.reddit_community_file_access_logs.findUniqueOrThrow({
      where: {
        id: props.logId,
        reddit_community_file_id: props.fileId,
      },
      ...RedditCommunityFileAccessLogTransformer.select(),
    });
  // Check moderator/admin authorization for sensitive access log information
  const member = await MyGlobal.prisma.reddit_community_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (member === null) {
    throw new HttpException("Unauthorized", 401);
  }
  return await RedditCommunityFileAccessLogTransformer.transform(accessLog);
}
