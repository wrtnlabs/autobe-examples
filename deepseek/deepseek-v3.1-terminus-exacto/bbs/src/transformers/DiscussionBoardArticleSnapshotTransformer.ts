import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleSnapshotTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        body: true,
        section_id: true,
        author_id: true,
        snapshot_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // article relation is required by schema but not used in DTO
        article: {
          select: { id: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot> {
    // Note: section and author need to be fetched separately using section_id and author_id
    // since they are scalar columns without direct relations in the schema
    return {
      id: input.id,
      title: input.title,
      body: input.body,
      section: {
        // TODO: Fetch section using input.section_id with DiscussionBoardSectionAtSummaryTransformer
        id: input.section_id,
        name: "",
        description: null,
        created_at: new Date().toISOString(),
      } satisfies IDiscussionBoardSection.ISummary,
      author: {
        // TODO: Fetch author using input.author_id with DiscussionBoardMemberAtSummaryTransformer
        id: input.author_id,
        display_name: "",
        bio: undefined,
      } satisfies IDiscussionBoardMember.ISummary,
      snapshotReason: input.snapshot_reason ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
