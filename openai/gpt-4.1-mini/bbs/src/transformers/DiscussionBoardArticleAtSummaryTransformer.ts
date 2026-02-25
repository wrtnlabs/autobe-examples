import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "./DiscussionBoardArticleTagAtSummaryTransformer";
import { DiscussionBoardRegisteredUserAtSummaryTransformer } from "./DiscussionBoardRegisteredUserAtSummaryTransformer";

export namespace DiscussionBoardArticleAtSummaryTransformer {
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
        },
        images: { select: { id: true } },
        tagMappings: { select: { id: true } },
        files: { select: { id: true } },
        comments: { select: { id: true } },
        searchIndexes: { select: { id: true } },
        articleTags: DiscussionBoardArticleTagAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticle.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: await DiscussionBoardRegisteredUserAtSummaryTransformer.transform(
        input.author,
      ),
      section: {
        id: input.section.id,
        name: input.section.name,
        description: input.section.description,
        createdAt: input.section.created_at.toISOString(),
        updatedAt: input.section.updated_at.toISOString(),
        deletedAt: input.section.deleted_at
          ? input.section.deleted_at.toISOString()
          : null,
      },
      commentCount: input.comments.length,
      tags: await ArrayUtil.asyncMap(
        input.articleTags,
        DiscussionBoardArticleTagAtSummaryTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
