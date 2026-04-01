import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
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
import { RedditCommunityUserProfileTransformer } from "../transformers/RedditCommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCommunityUserProfile.IUpdate;
}): Promise<IRedditCommunityUserProfile> {
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: { reddit_community_member_id: props.member.id },
    });
  await MyGlobal.prisma.reddit_community_user_profiles.update({
    where: { id: profile.id },
    data: {
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name ?? "",
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: { id: profile.id },
      ...RedditCommunityUserProfileTransformer.select(),
    });
  return await RedditCommunityUserProfileTransformer.transform(updated);
}
