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
import { RedditCloneCommentTransformer } from "../transformers/RedditCloneCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneProfilesProfileIdCommentsCommentId(props: {
  profileId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneComment> {
  const record = await MyGlobal.prisma.reddit_clone_comments.findFirstOrThrow({
    ...RedditCloneCommentTransformer.select(),
    where: {
      id: props.commentId,
      reddit_clone_user_profile_id: props.profileId,
      deleted_at: null,
    },
  });
  return await RedditCloneCommentTransformer.transform(record);
}
