import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumComment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postPoliticalForumCitizenPostsPostIdComments(props: {
  citizen: CitizenPayload;
  postId: string;
  body: IPoliticalForumComment.ICreate;
}): Promise<IPoliticalForumComment> {
  // Verify the target post exists and is not deleted
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Post not found or has been deleted", 404);
  }

  // Create the comment
  const createdComment = await MyGlobal.prisma.political_forum_comments.create({
    data: {
      id: v4(),
      post_id: props.postId,
      citizen_id: props.citizen.id,
      body: props.body,
      created_at: toISOStringSafe(new Date()),
      updated_at: null,
      deleted_at: null,
    },
  });

  // Return only the body as a string to match IPoliticalForumComment type
  return createdComment.body;
}
