import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommentDeletionTransformer } from "../transformers/RedditCommunityCommentDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityCommentsCommentIdDeletionsDeletionId(props: {
  commentId: string & tags.Format<"uuid">;
  deletionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommentDeletion> {
  const deletion =
    await MyGlobal.prisma.reddit_community_comment_deletions.findUniqueOrThrow({
      where: {
        id: props.deletionId,
        reddit_community_comment_id: props.commentId,
      },
      ...RedditCommunityCommentDeletionTransformer.select(),
    });
  return await RedditCommunityCommentDeletionTransformer.transform(deletion);
}
