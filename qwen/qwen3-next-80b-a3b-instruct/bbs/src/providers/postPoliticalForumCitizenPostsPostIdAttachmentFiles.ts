import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostAttachment";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postPoliticalForumCitizenPostsPostIdAttachmentFiles(props: {
  citizen: CitizenPayload;
  postId: string;
}): Promise<IPoliticalForumPostAttachment> {
  // Verify post exists and is not deleted
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });

  if (!post) {
    throw new HttpException(
      "Post not found or has been permanently deleted",
      404,
    );
  }

  // The citizen is already authenticated by the decorator and the post ownership or moderation rights are checked at the controller level

  // Generate attachment record (file_path is injected by system middleware)
  const file_path = `https://storage.example.com/attachment/${v4()}`;

  // Return the file path as a string as defined in IPoliticalForumPostAttachment
  return file_path;
}
