import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostRevision";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
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

export async function patchRedditLikeMemberPostsPostIdRevisions(props: {
  member: MemberPayload;
  postId: string;
  body: IRedditLikePostRevision.IRequest;
}): Promise<IPageIRedditLikePostRevision.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch the post to verify existence and get community_id
  const post = await MyGlobal.prisma.reddit_like_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, community_id: true, author_id: true },
  });
  // Authorization: member is author OR community moderator
  const [authorRole, communityModerator] = await Promise.all([
    MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.member.id,
        community_id: post.community_id,
        role: { in: ["owner", "moderator"] },
      },
    }),
    MyGlobal.prisma.reddit_like_posts.findFirst({
      where: {
        id: props.postId,
        author_id: props.member.id,
      },
    }),
  ]);
  if (!authorRole && !communityModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Query revisions with correct field names and select only available fields
  const data = await MyGlobal.prisma.reddit_like_post_revisions.findMany({
    where: { reddit_like_post_id: props.postId },
    skip,
    take: limit,
    orderBy: { revision_number: "asc" },
    select: {
      id: true,
      title: true,
      content: true,
      url: true,
      image_url: true,
      revision_number: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_post_revisions.count({
    where: { reddit_like_post_id: props.postId },
  });
  return {
    data: data.map((revision) => ({
      id: revision.id,
      title: revision.title,
      content: revision.content ?? undefined,
      url: revision.url ?? undefined,
      image_url: revision.image_url ?? undefined,
      revision_number: revision.revision_number,
      created_at: revision.created_at.toISOString(),
      type: "text" as const,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
