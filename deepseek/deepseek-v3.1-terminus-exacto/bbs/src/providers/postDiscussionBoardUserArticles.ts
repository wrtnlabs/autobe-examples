import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleCollector } from "../collectors/DiscussionBoardArticleCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserArticles(props: {
  user: UserPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Validate that the section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.body.section_id,
      status: "active",
    },
  });
  if (!section) {
    throw new HttpException("Section not found or inactive", 404);
  }
  try {
    // Create the article using collector pattern
    const created = await MyGlobal.prisma.discussion_board_articles.create({
      data: await DiscussionBoardArticleCollector.collect({
        body: props.body,
        discussionBoardUsers: { id: props.user.id },
      }),
      ...DiscussionBoardArticleTransformer.select(),
    });
    return await DiscussionBoardArticleTransformer.transform(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Article creation failed due to constraint violation",
          400,
        );
      }
      if (error.code === "P2003") {
        throw new HttpException("Invalid section reference", 400);
      }
    }
    throw new HttpException("Failed to create article", 500);
  }
}
