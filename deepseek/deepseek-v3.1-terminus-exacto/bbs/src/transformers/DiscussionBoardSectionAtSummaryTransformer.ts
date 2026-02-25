import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSectionAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        createdByAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        lastModifiedByAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        auditActions: {
          select: { id: true },
        } satisfies Prisma.discussion_board_audit_logsFindManyArgs,
        snapshots: {
          select: { id: true },
        } satisfies Prisma.discussion_board_section_snapshotsFindManyArgs,
        statistic: {
          select: { id: true, view_count: true },
        } satisfies Prisma.discussion_board_section_statisticsFindManyArgs,
        administratorAssignments: {
          select: { id: true },
        } satisfies Prisma.discussion_board_section_administratorsFindManyArgs,
        preferences: {
          select: { id: true },
        } satisfies Prisma.discussion_board_section_preferencesFindManyArgs,
        archive: {
          select: { id: true, archived_at: true },
        } satisfies Prisma.discussion_board_section_archivesFindManyArgs,
        files: {
          select: { id: true, filename: true },
        } satisfies Prisma.discussion_board_section_filesFindManyArgs,
        images: {
          select: { id: true },
        } satisfies Prisma.discussion_board_section_imagesFindManyArgs,
        articles: {
          select: { id: true, title: true },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
        moderationLogs: {
          select: { id: true },
        } satisfies Prisma.discussion_board_moderation_logsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSection.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      status: input.status,
      display_order: input.display_order,
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
