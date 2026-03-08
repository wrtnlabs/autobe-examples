import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformModeratorHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeratorHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformModeratorHistoryTransformer } from "../transformers/RedditPlatformModeratorHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformAdminHistoriesHistoryId(props: {
  admin: AdminPayload;
  historyId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformModeratorHistory> {
  const history =
    await MyGlobal.prisma.reddit_platform_moderator_histories.findUniqueOrThrow(
      {
        where: { id: props.historyId },
        ...RedditPlatformModeratorHistoryTransformer.select(),
      },
    );
  return await RedditPlatformModeratorHistoryTransformer.transform(history);
}
