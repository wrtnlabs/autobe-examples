import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getDiscussionBoardAdminArticlesArticleIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        discussion_board_article_id: props.articleId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        discussion_board_section_id: true,
        discussion_board_user_id: true,
        discussion_board_article_id: true,
      },
    });
  // Fetch related data separately
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: snapshot.discussion_board_section_id },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        display_order: true,
        deleted_at: true,
      },
    });
  const author = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow(
    {
      where: { id: snapshot.discussion_board_user_id },
      select: {
        id: true,
        display_name: true,
        bio: true,
        created_at: true,
      },
    },
  );
  return {
    id: snapshot.id,
    title: snapshot.title,
    content: snapshot.content,
    section: {
      id: section.id,
      name: section.name,
      description: section.description ?? "",
      status: section.status,
      display_order: section.display_order,
      deleted_at: section.deleted_at
        ? toISOStringSafe(section.deleted_at)
        : null,
    } satisfies IDiscussionBoardSection.ISummary,
    author: {
      id: author.id,
      display_name: author.display_name,
      bio: author.bio ?? null,
      created_at: toISOStringSafe(author.created_at),
    } satisfies IDiscussionBoardUser.ISummary,
    created_at: toISOStringSafe(snapshot.created_at),
    article_id: snapshot.discussion_board_article_id,
  };
}
