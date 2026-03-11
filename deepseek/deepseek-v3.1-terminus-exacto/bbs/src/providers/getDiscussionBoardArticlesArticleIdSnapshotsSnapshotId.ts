import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleSnapshotTransformer } from "../transformers/DiscussionBoardArticleSnapshotTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardArticlesArticleIdSnapshotsSnapshotId(props: {
  articleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        discussion_board_article_id: props.articleId,
      },
      ...DiscussionBoardArticleSnapshotTransformer.select(),
    });
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: snapshot.section_id },
      ...DiscussionBoardSectionAtSummaryTransformer.select(),
    });
  const author =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: snapshot.author_id },
      ...DiscussionBoardMemberAtSummaryTransformer.select(),
    });
  return {
    id: snapshot.id,
    title: snapshot.title,
    body: snapshot.body,
    section:
      await DiscussionBoardSectionAtSummaryTransformer.transform(section),
    author: await DiscussionBoardMemberAtSummaryTransformer.transform(author),
    snapshotReason: snapshot.snapshot_reason ?? undefined,
    createdAt: snapshot.created_at.toISOString(),
    updatedAt: snapshot.updated_at.toISOString(),
    deletedAt: snapshot.deleted_at ? snapshot.deleted_at.toISOString() : null,
  };
}
