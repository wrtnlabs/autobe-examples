import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityUserProfileAtInvertTransformer } from "../transformers/RedditCommunityUserProfileAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityGuestMembersMemberIdProfile(props: {
  guest: GuestPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserProfile.IInvert> {
  const profile =
    await MyGlobal.prisma.reddit_community_user_profiles.findUniqueOrThrow({
      where: {
        reddit_community_member_id: props.memberId,
        deleted_at: null,
      },
      ...RedditCommunityUserProfileAtInvertTransformer.select(),
    });
  return await RedditCommunityUserProfileAtInvertTransformer.transform(profile);
}
