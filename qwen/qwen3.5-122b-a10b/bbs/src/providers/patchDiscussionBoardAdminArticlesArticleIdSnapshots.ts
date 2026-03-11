import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminArticlesArticleIdSnapshots(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // Verify article exists
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where condition
  const whereInput: Prisma.discussion_board_article_snapshotsWhereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
  };
  // Build order by
  const orderByInput: Prisma.discussion_board_article_snapshotsOrderByWithRelationInput =
    props.body.order === "asc" ? { created_at: "asc" } : { created_at: "desc" };
  // Fetch snapshots
  const snapshots =
    await MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        discussion_board_member_id: true,
        discussion_board_section_id: true,
        title: true,
        tags: true,
        file_count: true,
        image_count: true,
        created_at: true,
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.discussion_board_article_snapshots.count({
    where: whereInput,
  });
  // Fetch unique member and section IDs
  const memberIds = [
    ...new Set(snapshots.map((s) => s.discussion_board_member_id)),
  ];
  const sectionIds = [
    ...new Set(snapshots.map((s) => s.discussion_board_section_id)),
  ];
  // Fetch member data
  const members =
    memberIds.length > 0
      ? await MyGlobal.prisma.discussion_board_members.findMany({
          where: { id: { in: memberIds } },
          select: {
            id: true,
            display_name: true,
            ban_status: true,
            created_at: true,
          },
        })
      : [];
  // Fetch section data with creator relation
  const sections =
    sectionIds.length > 0
      ? await MyGlobal.prisma.discussion_board_sections.findMany({
          where: { id: { in: sectionIds } },
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            creator: {
              select: {
                id: true,
                display_name: true,
                bio: true,
                grade: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        })
      : [];
  // Create lookup maps
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const sectionMap = new Map(sections.map((s) => [s.id, s]));
  // Transform snapshots with member and section data
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    const member = memberMap.get(snapshot.discussion_board_member_id);
    const section = sectionMap.get(snapshot.discussion_board_section_id);
    return {
      id: snapshot.id,
      title: snapshot.title,
      author: member
        ? ({
            id: member.id,
            display_name: member.display_name,
            ban_status: member.ban_status,
            created_at: member.created_at.toISOString(),
          } satisfies IDiscussionBoardMember.ISummary)
        : ({} as IDiscussionBoardMember.ISummary),
      section: section
        ? ({
            id: section.id,
            name: section.name,
            description: section.description ?? null,
            creator: {
              id: section.creator.id,
              display_name: section.creator.display_name,
              bio: section.creator.bio ?? null,
              grade: section.creator.grade,
              created_at: section.creator.created_at.toISOString(),
              updated_at: section.creator.updated_at.toISOString(),
              deleted_at: section.creator.deleted_at?.toISOString() ?? null,
            },
            created_at: section.created_at.toISOString(),
            updated_at: section.updated_at.toISOString(),
            deleted_at: section.deleted_at?.toISOString() ?? null,
          } satisfies IDiscussionBoardSection.ISummary)
        : ({} as IDiscussionBoardSection.ISummary),
      tags: snapshot.tags ?? null,
      file_count: snapshot.file_count,
      image_count: snapshot.image_count,
      created_at: snapshot.created_at.toISOString(),
    } satisfies IDiscussionBoardArticleSnapshot.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
