import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function getDiscussionBoardArticlesArticleIdSnapshotsSnapshotId(props: {
  articleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardArticleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.discussion_board_article_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        article_id: props.articleId,
      },
      include: {
        authorUser: true,
        authorAdmin: true,
      },
    });
  if (!snapshot) {
    throw new HttpException(
      "Snapshot not found for the given articleId and snapshotId",
      404,
    );
  }
  let author_user = undefined;
  let author_admin = undefined;
  if (snapshot.author_user_id !== null && snapshot.authorUser) {
    author_user = {
      id: snapshot.authorUser.id,
      email: snapshot.authorUser.email,
      is_email_verified: snapshot.authorUser.is_email_verified,
      is_active: snapshot.authorUser.is_active,
      is_blocked: snapshot.authorUser.is_blocked,
      created_at: toISOStringSafe(snapshot.authorUser.created_at),
      updated_at: toISOStringSafe(snapshot.authorUser.updated_at),
      deleted_at:
        snapshot.authorUser.deleted_at !== null
          ? toISOStringSafe(snapshot.authorUser.deleted_at)
          : undefined,
    };
  }
  // FIX: Only populate author_admin if display_name exists (would indicate correct admin structure), otherwise leave undefined
  // Our current authorAdmin does NOT have display_name. So, set author_admin undefined always.
  // If in the future there is an authorAdmin relation with display_name, handle it then.
  return {
    id: snapshot.id,
    article_id: snapshot.article_id,
    author_user_id:
      snapshot.author_user_id !== null ? snapshot.author_user_id : null,
    author_admin_id:
      snapshot.author_admin_id !== null ? snapshot.author_admin_id : null,
    author_user,
    author_admin: undefined,
    title: snapshot.title,
    body: snapshot.body,
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
