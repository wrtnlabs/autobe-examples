import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeUserProfileTransformer } from "../transformers/RedditLikeUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeProfilesMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeUserProfile> {
  const record =
    await MyGlobal.prisma.reddit_like_user_profiles.findFirstOrThrow({
      ...RedditLikeUserProfileTransformer.select(),
      where: {
        reddit_like_member_id: props.memberId,
        deleted_at: null,
      },
    });
  return await RedditLikeUserProfileTransformer.transform(record);
}
