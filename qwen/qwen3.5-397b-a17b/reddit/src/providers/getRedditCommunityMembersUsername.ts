import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserProfileTransformer } from "../transformers/RedditCommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMembersUsername(props: {
  username: string;
}): Promise<IRedditCommunityUserProfile> {
  const record =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
      where: {
        deleted_at: null,
        member: {
          username: props.username,
        },
      },
      ...RedditCommunityUserProfileTransformer.select(),
    });
  return await RedditCommunityUserProfileTransformer.transform(record);
}
