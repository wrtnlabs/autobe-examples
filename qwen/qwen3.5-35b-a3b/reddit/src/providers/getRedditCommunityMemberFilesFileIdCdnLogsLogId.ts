import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileCdnLogTransformer } from "../transformers/RedditCommunityFileCdnLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberFilesFileIdCdnLogsLogId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileCdnLog> {
  const log =
    await MyGlobal.prisma.reddit_community_file_cdn_logs.findUniqueOrThrow({
      where: {
        id: props.logId,
        reddit_community_file_id: props.fileId,
        deleted_at: null,
      },
      ...RedditCommunityFileCdnLogTransformer.select(),
    });
  return await RedditCommunityFileCdnLogTransformer.transform(log);
}
