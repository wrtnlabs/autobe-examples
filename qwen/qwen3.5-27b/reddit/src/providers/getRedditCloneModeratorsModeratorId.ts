import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneModeratorTransformer } from "../transformers/RedditCloneModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorsModeratorId(props: {
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneModerator> {
  const record = await MyGlobal.prisma.reddit_clone_moderators.findFirstOrThrow(
    {
      ...RedditCloneModeratorTransformer.select(),
      where: {
        id: props.moderatorId,
        deleted_at: null,
      },
    },
  );
  return await RedditCloneModeratorTransformer.transform(record);
}
