import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardArticleSnapshotTransformer } from "../transformers/DiscussionBoardArticleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  articleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId, deleted_at: null },
      ...DiscussionBoardArticleSnapshotTransformer.select(),
    });
  if (snapshot.discussionBoardArticle.id !== props.articleId) {
    throw new HttpException(
      "Snapshot does not belong to the specified article",
      404,
    );
  }
  return await DiscussionBoardArticleSnapshotTransformer.transform(snapshot);
}
