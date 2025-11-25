import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachment";
import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconomicDiscussionMemberArticlesArticleIdAttachmentsAttachmentId(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  attachmentId: string & tags.Format<"uuid">;
}): Promise<IEconomicDiscussionAttachment> {
  const attachment =
    await MyGlobal.prisma.economic_discussion_attachments.findUnique({
      where: { id: props.attachmentId },
      include: {
        article: true,
      },
    });

  if (!attachment) {
    throw new HttpException("Attachment not found", 404);
  }

  if (attachment.economic_discussion_article_id !== props.articleId) {
    throw new HttpException(
      "Attachment does not belong to specified article",
      400,
    );
  }

  const article = await MyGlobal.prisma.economic_discussion_articles.findUnique(
    {
      where: { id: props.articleId },
    },
  );

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }

  const isMemberAuthor =
    article.economic_discussion_member_id === props.member.id;

  if (!isMemberAuthor) {
    throw new HttpException(
      "You can only access attachments on your own articles",
      403,
    );
  }

  // Need to handle the nullable UUID assignments
  let memberAuthor: IEconomicDiscussionMembers.ISummary | undefined;
  if (article.economic_discussion_member_id) {
    const member = await MyGlobal.prisma.economic_discussion_members.findUnique(
      {
        where: { id: article.economic_discussion_member_id },
      },
    );

    if (member) {
      memberAuthor = {
        id: member.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        username: member.username,
        email_verified: member.email_verified satisfies boolean as boolean,
        reputation_score: member.reputation_score satisfies number &
          tags.Type<"int32"> as number,
        created_at: toISOStringSafe(member.created_at),
      } satisfies IEconomicDiscussionMembers.ISummary;
    }
  }

  // Similarly for moderator author
  let moderatorAuthor: IEconomicDiscussionModerators.ISummary | undefined;
  if (article.economic_discussion_moderator_id) {
    const moderator =
      await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: article.economic_discussion_moderator_id },
      });

    if (moderator) {
      moderatorAuthor = {
        id: moderator.id satisfies string & tags.Format<"uuid"> as string &
          tags.Format<"uuid">,
        username: moderator.username,
        moderation_level: moderator.moderation_level as
          | "admin"
          | "standard"
          | "senior",
        created_at: toISOStringSafe(moderator.created_at),
      } satisfies IEconomicDiscussionModerators.ISummary;
    }
  }

  return {
    id: attachment.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    filename: attachment.filename,
    file_size: attachment.file_size satisfies number &
      tags.Type<"int32"> as number,
    file_type: attachment.file_type,
    mime_type: attachment.mime_type,
    uploaded_at: toISOStringSafe(attachment.uploaded_at),
    is_scanned: attachment.is_scanned satisfies boolean as boolean,
    article: {
      id: article.id satisfies string & tags.Format<"uuid"> as string &
        tags.Format<"uuid">,
      title: article.title,
      view_count: article.view_count satisfies number &
        tags.Type<"int32"> as number,
      created_at: toISOStringSafe(article.created_at),
      updated_at: toISOStringSafe(article.updated_at),
      economic_discussion_member_id:
        article.economic_discussion_member_id ?? "",
      economic_discussion_moderator_id:
        article.economic_discussion_moderator_id ?? "",
      member_author: memberAuthor,
      moderator_author: moderatorAuthor,
      categories: [],
      attachments_count: 0 satisfies number & tags.Type<"int32"> as number,
      comments_count: 0 satisfies number & tags.Type<"int32"> as number,
      status: article.status as "pending" | "approved" | "rejected",
    },
  } satisfies IEconomicDiscussionAttachment;
}
