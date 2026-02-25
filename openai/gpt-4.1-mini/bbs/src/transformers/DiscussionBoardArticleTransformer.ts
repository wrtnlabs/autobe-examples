import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleFileTransformer } from "./DiscussionBoardArticleFileTransformer";
import { DiscussionBoardArticleImageTransformer } from "./DiscussionBoardArticleImageTransformer";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "./DiscussionBoardArticleTagAtSummaryTransformer";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardArticleTransformer {
  export type Payload = Prisma.discussion_board_articlesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: DiscussionBoardRegisteredUserAtSummaryTransformer.select(),
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.discussion_board_sectionsFindManyArgs,
        files: DiscussionBoardArticleFileTransformer.select(),
        images: DiscussionBoardArticleImageTransformer.select(),
        tagMappings: {
          select: {
            tag: DiscussionBoardArticleTagAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_article_tag_mappingsFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_commentsFindManyArgs,
        searchIndexes: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_search_indexesFindManyArgs,
        articleTags: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_article_tagsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      author: await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
        input.author,
      ),
      section: {
        id: input.section.id,
        name: input.section.name,
        description: input.section.description,
        createdAt: toISOStringSafe(input.section.created_at),
        updatedAt: toISOStringSafe(input.section.updated_at),
        deletedAt: input.section.deleted_at
          ? toISOStringSafe(input.section.deleted_at)
          : null,
      },
      files: await ArrayUtil.asyncMap(
        input.files,
        DiscussionBoardArticleFileTransformer.transform,
      ),
      images: await ArrayUtil.asyncMap(
        input.images,
        DiscussionBoardArticleImageTransformer.transform,
      ),
      tags: await ArrayUtil.asyncMap(input.tagMappings, async (tagMapping) =>
        DiscussionBoardArticleTagAtSummaryTransformer.transform(tagMapping.tag),
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
