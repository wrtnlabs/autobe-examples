import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneUserProfileTransformer } from "../transformers/RedditCloneUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCloneUserProfile.IUpdate;
}): Promise<IRedditCloneUserProfile> {
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { reddit_clone_member_id: props.member.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.avatar !== undefined && { avatar: props.body.avatar }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { reddit_clone_member_id: props.member.id },
      ...RedditCloneUserProfileTransformer.select(),
    });
  return await RedditCloneUserProfileTransformer.transform(updated);
}
