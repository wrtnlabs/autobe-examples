import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconomicDiscussionMemberArticles(props: {
  member: MemberPayload;
  body: IEconomicDiscussionArticle.ICreate;
}): Promise<IEconomicDiscussionArticle> {
  // Validate member exists and is verified
  const memberRecord =
    await MyGlobal.prisma.economic_discussion_members.findUnique({
      where: { id: props.member.id },
    });

  if (!memberRecord) {
    throw new HttpException("Member not found", 404);
  }

  if (!memberRecord.email_verified) {
    throw new HttpException("Member email not verified", 403);
  }

  // Validate categories exist
  if (props.body.category_ids.length === 0) {
    throw new HttpException("At least one category is required", 400);
  }

  const categoryCount =
    await MyGlobal.prisma.economic_discussion_categories.count({
      where: {
        id: { in: props.body.category_ids },
        is_active: true,
      },
    });

  if (categoryCount !== props.body.category_ids.length) {
    throw new HttpException("One or more categories not found", 404);
  }

  // Generate article ID and timestamps
  const articleId = v4() as string & tags.Format<"uuid">;
  const now = new Date();

  // Create the article in a transaction
  const [article] = await MyGlobal.prisma.$transaction([
    // Create the article
    MyGlobal.prisma.economic_discussion_articles.create({
      data: {
        id: articleId,
        title: props.body.title,
        content: props.body.content,
        view_count: 0,
        version: 1,
        status: typia.assert<"pending" | "approved" | "rejected">("pending"),
        economic_discussion_member_id: props.member.id,
        economic_discussion_moderator_id: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),

    // Create category relationships
    ...props.body.category_ids.map((categoryId) =>
      MyGlobal.prisma.economic_discussion_article_categories.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_article_id: articleId,
          economic_discussion_category_id: categoryId,
          created_at: now,
        },
      }),
    ),

    // Create attachments if provided
    ...(props.body.attachments?.map((attachment) =>
      MyGlobal.prisma.economic_discussion_attachments.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          economic_discussion_article_id: articleId,
          filename: attachment.filename,
          file_size: attachment.file_size,
          file_type: attachment.file_type,
          mime_type: attachment.mime_type,
          file_path: "/uploads/" + v4(),
          uploaded_at: now,
          is_scanned: false,
        },
      }),
    ) || []),
  ]);

  // Get the article with just the basic categories (no include)
  const completeArticle =
    await MyGlobal.prisma.economic_discussion_articles.findUnique({
      where: { id: articleId },
    });

  if (!completeArticle) {
    throw new HttpException("Failed to retrieve created article", 500);
  }

  // Get category relationships - fix the select to only existing fields
  const articleCategories =
    await MyGlobal.prisma.economic_discussion_article_categories.findMany({
      where: { economic_discussion_article_id: articleId },
      select: {
        economic_discussion_category_id: true,
      },
    });

  // Get the actual category details using the IDs
  const categoryDetails =
    await MyGlobal.prisma.economic_discussion_categories.findMany({
      where: {
        id: {
          in: articleCategories.map((ac) => ac.economic_discussion_category_id),
        },
      },
    });

  // Get member data separately
  const memberData =
    await MyGlobal.prisma.economic_discussion_members.findUnique({
      where: { id: completeArticle.economic_discussion_member_id! },
    });

  // Get moderator data if exists
  const moderatorData = completeArticle.economic_discussion_moderator_id
    ? await MyGlobal.prisma.economic_discussion_moderators.findUnique({
        where: { id: completeArticle.economic_discussion_moderator_id },
      })
    : null;

  return {
    id: completeArticle.id,
    title: completeArticle.title,
    content: completeArticle.content,
    view_count: completeArticle.view_count,
    version: completeArticle.version,
    status: typia.assert<"pending" | "approved" | "rejected">(
      completeArticle.status,
    ),
    created_at: toISOStringSafe(completeArticle.created_at),
    updated_at: toISOStringSafe(completeArticle.updated_at),
    deleted_at: completeArticle.deleted_at
      ? toISOStringSafe(completeArticle.deleted_at)
      : null,
    member_author: completeArticle.economic_discussion_member_id!,
    moderator_author: completeArticle.economic_discussion_moderator_id,
    member_author_profile: memberData
      ? {
          id: memberData.id,
          username: memberData.username,
          email_verified: memberData.email_verified,
          reputation_score: memberData.reputation_score,
          created_at: toISOStringSafe(memberData.created_at),
        }
      : undefined,
    moderator_author_profile: moderatorData
      ? {
          id: moderatorData.id,
          username: moderatorData.username,
          moderation_level: typia.assert<"admin" | "standard" | "senior">(
            moderatorData.moderation_level,
          ),
          created_at: toISOStringSafe(moderatorData.created_at),
        }
      : undefined,
    categories: categoryDetails.map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
      display_order: category.display_order satisfies number as number,
      is_active: category.is_active,
      article_count: category.article_count satisfies number as number,
    })),
  } satisfies IEconomicDiscussionArticle;
}
