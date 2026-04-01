import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityUserAvatarTransformer } from "../transformers/RedditCommunityUserAvatarTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberAvatarsAvatarId(props: {
  member: MemberPayload;
  avatarId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserAvatar> {
  const avatar =
    await MyGlobal.prisma.reddit_community_user_avatars.findUniqueOrThrow({
      where: {
        id: props.avatarId,
        deleted_at: null,
      },
      ...RedditCommunityUserAvatarTransformer.select(),
    });
  return await RedditCommunityUserAvatarTransformer.transform(avatar);
}
