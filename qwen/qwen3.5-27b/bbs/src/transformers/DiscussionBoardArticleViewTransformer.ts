import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleView } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleView";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardMemberSessionAtSummaryTransformer } from "./DiscussionBoardMemberSessionAtSummaryTransformer";

export namespace DiscussionBoardArticleViewTransformer {
  export type Payload = Prisma.discussion_board_article_viewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        viewed_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
        memberSession:
          DiscussionBoardMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_viewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleView> {
    return {
      id: input.id,
      viewed_at: input.viewed_at.toISOString(),
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
      member: input.member
        ? await DiscussionBoardMemberAtSummaryTransformer.transform(
            input.member,
          )
        : null,
      memberSession: input.memberSession
        ? await DiscussionBoardMemberSessionAtSummaryTransformer.transform(
            input.memberSession,
          )
        : null,
    };
  }
}
