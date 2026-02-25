import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardRegisteredUserArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  if (!props.body.title || props.body.title.trim() === "") {
    throw new HttpException("Title is required", 400);
  }
  if (!props.body.content || props.body.content.trim() === "") {
    throw new HttpException("Content is required", 400);
  }
  if (
    !props.body.sectionId ||
    typeof props.body.sectionId !== "string" ||
    props.body.sectionId.trim() === ""
  ) {
    throw new HttpException("Valid sectionId is required", 400);
  }
  await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
    where: { id: props.body.sectionId },
  });
  const data = await DiscussionBoardArticleCollector.collect({
    body: props.body,
    author: { id: props.registeredUser.id },
  });
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data,
  });
  const found =
    await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
      where: { id: created.id },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return DiscussionBoardArticleTransformer.transform(found);
}
