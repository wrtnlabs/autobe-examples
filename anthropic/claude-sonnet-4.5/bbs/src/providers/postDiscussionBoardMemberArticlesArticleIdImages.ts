import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberArticlesArticleIdImages(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleImage.ICreate;
}): Promise<IDiscussionBoardArticleImage> {
  const { member, articleId, body } = props;

  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: articleId,
      deleted_at: null,
    },
  });

  if (!article) {
    throw new HttpException("Article not found", 404);
  }

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only upload images to your own articles",
      403,
    );
  }

  const imageCount =
    await MyGlobal.prisma.discussion_board_article_images.count({
      where: {
        discussion_board_article_id: articleId,
        deleted_at: null,
      },
    });

  if (imageCount >= 10) {
    throw new HttpException(
      "Maximum image limit reached: articles can have at most 10 images",
      400,
    );
  }

  const extension = body.original_name.split(".").pop() || "jpg";
  const storedName = `${v4()}.${extension}`;

  const created = await MyGlobal.prisma.discussion_board_article_images.create({
    data: {
      id: v4(),
      discussion_board_article_id: articleId,
      uploaded_by_member_id: member.id,
      original_name: body.original_name,
      stored_name: storedName,
      mime_type: body.mime_type,
      size_bytes: body.size_bytes,
      width: body.width,
      height: body.height,
      created_at: toISOStringSafe(new Date()),
    },
  });

  const uploader =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: member.id },
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
      },
    });

  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    uploaded_by_member_id: created.uploaded_by_member_id,
    url: body.url,
    original_name: created.original_name,
    stored_name: created.stored_name,
    mime_type: created.mime_type,
    size_bytes: created.size_bytes,
    width: created.width,
    height: created.height,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: null,
    uploader: {
      id: uploader.id,
      username: uploader.username,
      display_name: uploader.display_name ?? undefined,
      profile_picture_url: uploader.profile_picture_url ?? undefined,
    },
  };
}
