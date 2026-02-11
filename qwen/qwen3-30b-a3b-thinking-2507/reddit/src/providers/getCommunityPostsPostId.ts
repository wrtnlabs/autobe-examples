import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostId(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPost> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    ...CommunityPostTransformer.select(),
  });
  if (!post) throw new HttpException("Post not found", 404);
  return await CommunityPostTransformer.transform(post);
}
