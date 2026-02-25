import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";
import { DiscussionBoardUserAtSummaryTransformer } from "./DiscussionBoardUserAtSummaryTransformer";

export namespace DiscussionBoardContentFlagTransformer {
  export type Payload = Prisma.discussion_board_content_flagsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        flag_reason: true,
        status: true,
        resolution_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        resolved_at: true,
        reporter: DiscussionBoardUserAtSummaryTransformer.select(),
        flaggedArticle: DiscussionBoardArticleAtSummaryTransformer.select(),
        flaggedComment: DiscussionBoardCommentAtSummaryTransformer.select(),
        reviewingAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        moderationQueue: true,
      },
    } satisfies Prisma.discussion_board_content_flagsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardContentFlag> {
    return {
      id: input.id,
      flag_reason: input.flag_reason,
      status: input.status,
      resolution_reason: input.resolution_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      resolved_at: input.resolved_at ? input.resolved_at.toISOString() : null,
      reporter: await DiscussionBoardUserAtSummaryTransformer.transform(
        input.reporter,
      ),
      flaggedArticle: input.flaggedArticle
        ? await DiscussionBoardArticleAtSummaryTransformer.transform(
            input.flaggedArticle,
          )
        : null,
      flaggedComment: input.flaggedComment
        ? await DiscussionBoardCommentAtSummaryTransformer.transform(
            input.flaggedComment,
          )
        : null,
      reviewingAdmin: input.reviewingAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.reviewingAdmin,
          )
        : null,
    };
  }
}
