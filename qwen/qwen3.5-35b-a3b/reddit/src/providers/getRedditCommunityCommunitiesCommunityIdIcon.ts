import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityIconTransformer } from "../transformers/RedditCommunityCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommunitiesCommunityIdIcon(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityIcon> {
  const icon =
    await MyGlobal.prisma.reddit_community_community_icons.findUniqueOrThrow({
      where: { community_id: props.communityId },
      ...RedditCommunityCommunityIconTransformer.select(),
    });
  return await RedditCommunityCommunityIconTransformer.transform(icon);
}
