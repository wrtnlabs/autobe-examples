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
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardArticleSnapshotTransformer } from "../transformers/DiscussionBoardArticleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserArticlesArticleIdSnapshotsSnapshotId(props: {
  user: UserPayload;
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
        discussion_board_section_id: true,
        discussion_board_user_id: true,
        created_at: true,
        article: { select: { id: true } },
      },
    });
  return DiscussionBoardArticleSnapshotTransformer.transform(snapshot);
}
