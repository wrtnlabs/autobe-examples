import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostSnapshotCollector } from "../collectors/RedditClonePostSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostSnapshotTransformer } from "../transformers/RedditClonePostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostSnapshot.ICreate;
}): Promise<IRedditClonePostSnapshot> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, member_id: true },
  });
  if (post.member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot = await MyGlobal.prisma.reddit_clone_post_snapshots.create({
    data: await RedditClonePostSnapshotCollector.collect({
      body: props.body,
      redditClonePosts: { id: props.postId },
      redditCloneMembers: { id: props.member.id },
    }),
    ...RedditClonePostSnapshotTransformer.select(),
  });
  return await RedditClonePostSnapshotTransformer.transform(snapshot);
}
