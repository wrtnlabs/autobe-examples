import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function deletePoliticsBbsMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch article and validate ownership
  const article = await MyGlobal.prisma.politics_bbs_articles.findUniqueOrThrow(
    {
      where: {
        id: props.articleId,
        deleted_at: null,
      },
    },
  );

  // Authorization check: member must own the article
  if (article.politics_bbs_creator_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own articles",
      403,
    );
  }

  // Perform soft delete
  await MyGlobal.prisma.politics_bbs_articles.update({
    where: { id: props.articleId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
