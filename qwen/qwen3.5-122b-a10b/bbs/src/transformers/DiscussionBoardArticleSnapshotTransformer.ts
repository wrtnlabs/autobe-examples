import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleSnapshotTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        discussion_board_section_id: true,
        discussion_board_member_id: true,
        title: true,
        body: true,
        tags: true,
        file_count: true,
        image_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussionBoardArticle:
          DiscussionBoardArticleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot> {
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      tags: input.tags ?? null,
      fileCount: input.file_count,
      imageCount: input.image_count,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.discussionBoardArticle,
      ),
      section: {
        id: input.discussion_board_section_id,
        name: "" as string,
        created_at: "" as string & tags.Format<"date-time">,
        creator: {
          id: "" as string & tags.Format<"uuid">,
          email: "" as string & tags.Format<"email">,
          display_name: "" as string,
          grade: "" as string,
          created_at: "" as string & tags.Format<"date-time">,
        },
        article_count: 0 as number & tags.Type<"int32">,
      } satisfies IDiscussionBoardSection.ISummary,
      member: {
        id: input.discussion_board_member_id,
        displayName: "" as string,
        bio: null as string | null,
        articleCount: 0 as number & tags.Type<"int32">,
        commentCount: 0 as number & tags.Type<"int32">,
        createdAt: "" as string & tags.Format<"date-time">,
        updatedAt: "" as string & tags.Format<"date-time">,
        deletedAt: null as (string & tags.Format<"date-time">) | null,
      } satisfies IDiscussionBoardMember.ISummary,
    };
  }
}
