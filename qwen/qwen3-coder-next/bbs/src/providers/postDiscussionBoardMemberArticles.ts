import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleTransformer } from "../transformers/DiscussionBoardArticleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  // Create the article record with basic data
  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      title: props.body.title,
      content: props.body.content,
      section_id: props.body.section_id,
      author_id: props.member.id,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  // Handle tags if provided
  if (props.body.tags && props.body.tags.length > 0) {
    // Find or create all tags in a single batch operation
    const tagRecords = await MyGlobal.prisma.discussion_board_tags.findMany({
      where: {
        tag_name: {
          in: props.body.tags,
        },
      },
    });
    // Create any missing tags
    const existingTagNames = new Set(tagRecords.map((tag) => tag.tag_name));
    const missingTagNames = props.body.tags.filter(
      (tag) => !existingTagNames.has(tag),
    );
    if (missingTagNames.length > 0) {
      const newTags = await MyGlobal.prisma.discussion_board_tags.createMany({
        data: missingTagNames.map((tagName) => ({
          id: v4() as string & tags.Format<"uuid">,
          tag_name: tagName,
          created_at: toISOStringSafe(new Date()),
        })),
        skipDuplicates: true,
      });
      // Refresh tag records with newly created ones
      const newTagRecords =
        await MyGlobal.prisma.discussion_board_tags.findMany({
          where: {
            tag_name: {
              in: missingTagNames,
            },
          },
        });
      tagRecords.push(...newTagRecords);
    }
    // Create article-tag relationships
    if (tagRecords.length > 0) {
      await MyGlobal.prisma.discussion_board_article_tags.createMany({
        data: tagRecords.map((tag) => ({
          id: v4() as string & tags.Format<"uuid">,
          article_id: created.id,
          tag_name: tag.tag_name,
          created_at: toISOStringSafe(new Date()),
        })),
      });
    }
  }
  // Fetch complete article with all relations for transformation
  const completeArticle =
    await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: created.id },
      ...DiscussionBoardArticleTransformer.select(),
    });
  return await DiscussionBoardArticleTransformer.transform(completeArticle!);
}
