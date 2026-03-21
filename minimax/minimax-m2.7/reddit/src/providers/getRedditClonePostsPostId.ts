import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostLinkTransformer } from "../transformers/RedditClonePostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditClonePostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditClonePostLink> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    ...RedditClonePostLinkTransformer.select(),
  });
  return await RedditClonePostLinkTransformer.transform(post);
}
