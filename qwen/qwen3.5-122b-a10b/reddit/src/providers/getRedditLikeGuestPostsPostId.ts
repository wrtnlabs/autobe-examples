import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikePostTransformer } from "../transformers/RedditLikePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeGuestPostsPostId(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePost> {
  const record = await MyGlobal.prisma.reddit_like_posts.findFirstOrThrow({
    ...RedditLikePostTransformer.select(),
    where: {
      id: props.postId,
      deleted_at: null,
    } satisfies Prisma.reddit_like_postsWhereInput,
  });
  return await RedditLikePostTransformer.transform(record);
}
