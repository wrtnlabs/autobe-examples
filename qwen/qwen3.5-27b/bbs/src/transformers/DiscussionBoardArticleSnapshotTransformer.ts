import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardArticleSnapshotTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        author: DiscussionBoardMemberAtSummaryTransformer.select(),
        section: DiscussionBoardSectionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      created_at: input.created_at.toISOString(),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      author: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.author,
      ),
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.section,
      ),
    };
  }
}
