import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostSnapshot";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostSnapshot.IRequest;
}): Promise<IPageIRedditClonePostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { member_id: true, community_id: true },
  });
  const isAuthor = post.member_id === props.member.id;
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      member_id: props.member.id,
      community_id: post.community_id,
    },
  });
  const isModerator = moderator !== null;
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const orderByInput =
    sort === "created_at"
      ? { created_at: direction as "asc" | "desc" }
      : { created_at: direction as "asc" | "desc" };
  const snapshots = await MyGlobal.prisma.reddit_clone_post_snapshots.findMany({
    where: { reddit_clone_post_id: props.postId },
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      title: true,
      post_type: true,
      created_at: true,
      reddit_clone_member_id: true,
    },
  });
  const memberIds = [
    ...new Set(snapshots.map((s) => s.reddit_clone_member_id)),
  ];
  const members = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: { id: { in: memberIds } },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar: true,
      created_at: true,
      karmaScore: {
        select: {
          score: true,
        },
      },
    },
  });
  const memberMap = new Map(
    members.map((m) => [
      m.id,
      {
        id: m.id,
        username: m.username,
        display_name: m.display_name,
        avatar: m.avatar ?? null,
        karma_score: m.karmaScore?.score ?? 0,
        created_at: m.created_at.toISOString(),
      } satisfies IRedditCloneMember.ISummary,
    ]),
  );
  const total = await MyGlobal.prisma.reddit_clone_post_snapshots.count({
    where: { reddit_clone_post_id: props.postId },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: snapshots.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          title: snapshot.title,
          post_type: snapshot.post_type,
          created_at: snapshot.created_at.toISOString(),
          author: memberMap.get(snapshot.reddit_clone_member_id)!,
        }) satisfies IRedditClonePostSnapshot.ISummary,
    ),
  } satisfies IPageIRedditClonePostSnapshot.ISummary;
}
