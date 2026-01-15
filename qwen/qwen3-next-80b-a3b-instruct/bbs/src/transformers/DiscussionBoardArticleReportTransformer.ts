import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardArticleReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReport";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleStatus";
import { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCitizenAtSummaryTransformer } from "./DiscussionBoardCitizenAtSummaryTransformer";

export namespace DiscussionBoardArticleReportTransformer {
  export type Payload = Prisma.discussion_board_article_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        citizen: DiscussionBoardCitizenAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleReport> {
    return {
      id: input.id,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      reporter: await DiscussionBoardCitizenAtSummaryTransformer.transform(
        input.citizen,
      ),
      reason: input.reason,
      status: "pending", // Business logic: New reports start as pending
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
