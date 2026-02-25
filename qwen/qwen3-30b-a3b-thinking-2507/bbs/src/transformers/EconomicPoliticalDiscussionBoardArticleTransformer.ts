import { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardAttachmentTransformer } from "./EconomicPoliticalDiscussionBoardAttachmentTransformer";
import { EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardTagAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardTagAtSummaryTransformer";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardArticleTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_articlesGetPayload<
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
        section:
          EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.select(),
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        attachments:
          EconomicPoliticalDiscussionBoardAttachmentTransformer.select(),
        articleTags:
          EconomicPoliticalDiscussionBoardTagAtSummaryTransformer.select(),
        comments: true,
      },
    } satisfies Prisma.economic_political_discussion_board_articlesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardArticle> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      section:
        await EconomicPoliticalDiscussionBoardSectionAtSummaryTransformer.transform(
          input.section,
        ),
      user: await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      attachments: await ArrayUtil.asyncMap(
        input.attachments,
        EconomicPoliticalDiscussionBoardAttachmentTransformer.transform,
      ),
      articleTags: await ArrayUtil.asyncMap(
        input.articleTags,
        EconomicPoliticalDiscussionBoardTagAtSummaryTransformer.transform,
      ),
      comments_count: input.comments?.length || 0,
    };
  }
}
