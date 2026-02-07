import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostSnapshot.ISummary> {
  const snapshots =
    await MyGlobal.prisma.reddit_platform_post_snapshots.findMany({
      where: { reddit_platform_post_id: props.postId },
      orderBy: { created_at: "asc" },
    });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      type: snapshot.type,
      title: snapshot.title,
      content_text:
        snapshot.content_text === null ? undefined : snapshot.content_text,
      url: snapshot.url === null ? undefined : snapshot.url,
      image_url: snapshot.image_url === null ? undefined : snapshot.image_url,
      vote_score: snapshot.vote_score,
      comment_count: snapshot.comment_count,
      author_id: snapshot.author_id,
      community_id: snapshot.community_id,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
  };
}
