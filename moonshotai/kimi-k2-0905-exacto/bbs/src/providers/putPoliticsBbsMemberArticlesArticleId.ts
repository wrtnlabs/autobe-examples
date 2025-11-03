import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";
import { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putPoliticsBbsMemberArticlesArticleId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IPoliticsBbsArticle.IUpdate;
}): Promise<IPoliticsBbsArticle> {
  const { member, articleId, body } = props;

  // Authorization: Ensure member exists and is not deleted
  await MyGlobal.prisma.politics_bbs_members.findUniqueOrThrow({
    where: {
      id: member.id,
      deleted_at: null,
    },
  });

  // Fetch article and verify ownership
  const article = await MyGlobal.prisma.politics_bbs_articles.findUniqueOrThrow(
    {
      where: { id: articleId },
    },
  );

  if (article.politics_bbs_creator_id !== member.id) {
    throw new HttpException("Only article creators can edit articles", 403);
  }

  // Check 24-hour editing window
  const currentTime = toISOStringSafe(new Date());
  const hoursSinceCreation =
    (Date.parse(currentTime) -
      Date.parse(toISOStringSafe(article.created_at))) /
    (1000 * 60 * 60);

  if (hoursSinceCreation > 24) {
    throw new HttpException(
      "Articles can only be edited within 24 hours of creation",
      403,
    );
  }

  // Create snapshot for audit trail
  const snapshotData = {
    id: v4() as string & tags.Format<"uuid">,
    politics_bbs_article_id: articleId,
    title: article.title,
    content: article.content,
    state: article.state,
    view_count: article.view_count,
    created_at: currentTime,
  };

  await MyGlobal.prisma.politics_bbs_article_snapshots.create({
    data: snapshotData,
  });

  // Update article with partial data support
  const updated = await MyGlobal.prisma.politics_bbs_articles.update({
    where: { id: articleId },
    data: {
      title: body.title ?? undefined,
      content: body.content ?? undefined,
      politics_bbs_category_id: body.politics_bbs_category_id ?? undefined,
      updated_at: currentTime,
    },
  });

  // Return article with proper type conversion
  return {
    id: updated.id,
    politics_bbs_category_id: updated.politics_bbs_category_id,
    politics_bbs_creator_id: updated.politics_bbs_creator_id,
    title: updated.title,
    content: updated.content,
    state: updated.state,
    view_count: updated.view_count,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
