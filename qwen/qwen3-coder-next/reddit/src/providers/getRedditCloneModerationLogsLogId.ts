import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModerationLogTransformer } from "../transformers/RedditCloneModerationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModerationLogsLogId(props: {
  logId: string;
  session_id: string;
}): Promise<IRedditCloneModerationLog> {
  const session = jwt.verify(props.session_id, MyGlobal.env.JWT_SECRET_KEY) as {
    id: string;
    role: "moderator" | "owner" | "member" | "guest";
  };
  if (session.role !== "moderator" && session.role !== "owner") {
    throw new HttpException("Forbidden", 403);
  }
  const log =
    await MyGlobal.prisma.reddit_clone_moderation_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...RedditCloneModerationLogTransformer.select(),
    });
  return await RedditCloneModerationLogTransformer.transform(log);
}
