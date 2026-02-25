import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardArticleTagAtSummaryTransformer } from "./DiscussionBoardArticleTagAtSummaryTransformer";

export namespace DiscussionBoardArticleTagMappingAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_tag_mappingsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_tag_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        tag: DiscussionBoardArticleTagAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_tag_mappingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleTagMapping.ISummary> {
    return {
      id: input.id,
      discussionBoardArticleId: input.discussion_board_article_id,
      discussionBoardTagId: input.discussion_board_tag_id,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      tag: await DiscussionBoardArticleTagAtSummaryTransformer.transform(
        input.tag,
      ),
    };
  }
}
