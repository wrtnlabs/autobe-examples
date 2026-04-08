import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModeratorSessionTransformer } from "../transformers/RedditCloneModeratorSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorModeratorSessionsSessionId(props: {
  moderator: ModeratorPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneModeratorSession> {
  const record =
    await MyGlobal.prisma.reddit_clone_moderator_sessions.findFirstOrThrow({
      ...RedditCloneModeratorSessionTransformer.select(),
      where: {
        id: props.sessionId,
      },
    });
  return await RedditCloneModeratorSessionTransformer.transform(record);
}
