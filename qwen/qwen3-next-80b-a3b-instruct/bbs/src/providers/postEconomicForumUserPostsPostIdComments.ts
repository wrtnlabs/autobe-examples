import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomicForumPostCommentCollector } from "../collectors/EconomicForumPostCommentCollector";
import { EconomicForumPostCommentTransformer } from "../transformers/EconomicForumPostCommentTransformer";

export async function postEconomicForumUserPostsPostIdComments(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconomicForumPostComment.ICreate;
}): Promise<IEconomicForumPostComment> {
  // Verify the post exists
  const post = await MyGlobal.prisma.economic_forum_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  // Use existing collector to transform API DTO to Prisma CreateInput
  const created = await MyGlobal.prisma.economic_forum_post_comments.create({
    data: await EconomicForumPostCommentCollector.collect({
      body: props.body,
      economicForumUsers: { id: props.user.id },
      economicForumUserSessions: { id: props.user.session_id },
      economicForumPosts: { id: props.postId },
    }),
    ...EconomicForumPostCommentTransformer.select(),
  });
  // Use existing transformer to format Prisma result to API DTO
  return await EconomicForumPostCommentTransformer.transform(created);
}
