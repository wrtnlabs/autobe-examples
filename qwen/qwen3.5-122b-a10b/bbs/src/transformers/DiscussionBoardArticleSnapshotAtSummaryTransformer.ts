import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "./DiscussionBoardSectionAtSummaryTransformer";

export namespace DiscussionBoardArticleSnapshotAtSummaryTransformer {
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
        discussionBoardArticle: {
          select: {
            id: true,
            section: DiscussionBoardSectionAtSummaryTransformer.select(),
            member: DiscussionBoardMemberAtSummaryTransformer.select(),
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot.ISummary> {
    return {
      id: input.id,
      discussion_board_article_id: input.discussionBoardArticle.id,
      title: input.title,
      body: input.body,
      tags: input.tags,
      file_count: input.file_count,
      image_count: input.image_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      section: await DiscussionBoardSectionAtSummaryTransformer.transform(
        input.discussionBoardArticle.section,
      ),
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.discussionBoardArticle.member,
      ),
    };
  }
}
