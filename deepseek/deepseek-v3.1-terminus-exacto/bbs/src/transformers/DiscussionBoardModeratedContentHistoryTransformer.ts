import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardModeratedContentHistoryTransformer {
  export type Payload =
    Prisma.discussion_board_moderated_content_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        content_type: true,
        moderation_action: true,
        moderation_reason: true,
        original_content: true,
        moderated_content: true,
        created_at: true,
        moderatedArticle: DiscussionBoardArticleAtSummaryTransformer.select(),
        moderatedComment: DiscussionBoardCommentAtSummaryTransformer.select(),
        moderatorAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        moderatorSuperAdmin:
          DiscussionBoardSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_moderated_content_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModeratedContentHistory> {
    return {
      id: input.id,
      content_type: input.content_type,
      moderation_action: input.moderation_action,
      moderation_reason: input.moderation_reason,
      original_content: input.original_content ?? undefined,
      moderated_content: input.moderated_content ?? undefined,
      created_at: input.created_at.toISOString(),
      moderatedArticle: input.moderatedArticle
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.moderatedArticle,
          )
        : undefined,
      moderatedComment: input.moderatedComment
        ? await DiscussionBoardCommentAtSummaryTransformer.transform(
            input.moderatedComment,
          )
        : undefined,
      moderatorAdmin: input.moderatorAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.moderatorAdmin,
          )
        : undefined,
      moderatorSuperAdmin: input.moderatorSuperAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.moderatorSuperAdmin,
          )
        : undefined,
    };
  }
}
