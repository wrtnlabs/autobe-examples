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
import { DiscussionBoardArticleSnapshotCollector } from "../collectors/DiscussionBoardArticleSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardArticleSnapshotTransformer } from "../transformers/DiscussionBoardArticleSnapshotTransformer";
import { DiscussionBoardMemberAtSummaryTransformer } from "../transformers/DiscussionBoardMemberAtSummaryTransformer";
import { DiscussionBoardSectionAtSummaryTransformer } from "../transformers/DiscussionBoardSectionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberArticlesSnapshots(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleSnapshot.ICreate;
}): Promise<IDiscussionBoardArticleSnapshot> {
  // 1. Verify article exists and member owns it
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.body.discussion_board_article_id,
      deleted_at: null,
    },
    select: {
      id: true,
      discussion_board_member_id: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Ownership validation: members own articles they create
  if (article.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Create snapshot using Collector
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.create({
      data: await DiscussionBoardArticleSnapshotCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardArticleSnapshotTransformer.select(),
    });
  // 3. Fetch section and author data for the snapshot
  const [sectionEntity, authorEntity] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findUnique({
      where: { id: snapshot.section_id },
    }),
    MyGlobal.prisma.discussion_board_members.findUnique({
      where: { id: snapshot.author_id },
    }),
  ]);
  if (!sectionEntity || !authorEntity) {
    throw new HttpException("Section or author not found", 404);
  }
  const [section, author] = await Promise.all([
    DiscussionBoardSectionAtSummaryTransformer.transform(sectionEntity),
    DiscussionBoardMemberAtSummaryTransformer.transform(authorEntity),
  ]);
  // 4. Transform and return with populated section/author
  const transformed =
    await DiscussionBoardArticleSnapshotTransformer.transform(snapshot);
  // Override with fetched data
  return {
    ...transformed,
    section,
    author,
  };
}
