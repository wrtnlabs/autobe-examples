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
import { RedditCommunityUserAvatarCollector } from "../collectors/RedditCommunityUserAvatarCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityUserAvatarTransformer } from "../transformers/RedditCommunityUserAvatarTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberAvatars(props: {
  member: MemberPayload;
  body: IRedditCommunityUserAvatar.ICreate;
}): Promise<IRedditCommunityUserAvatar> {
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findFirstOrThrow({
      where: {
        reddit_community_member_id: props.member.id,
        deleted_at: null,
      },
    });
  const created = await MyGlobal.prisma.reddit_community_user_avatars.create({
    data: await RedditCommunityUserAvatarCollector.collect({
      body: props.body,
      redditCommunityUserProfiles: { id: profile.id },
    }),
    ...RedditCommunityUserAvatarTransformer.select(),
  });
  return await RedditCommunityUserAvatarTransformer.transform(created);
}
