import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const whereInput: Prisma.reddit_community_post_snapshotsWhereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.edited_by_member_id && {
      edited_by_member_id: props.body.edited_by_member_id,
    }),
    ...(props.body.post_type && {
      post_type: props.body.post_type,
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: toISOStringSafe(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: toISOStringSafe(props.body.created_at_lte),
      },
    }),
  };
  const orderByInput: Prisma.reddit_community_post_snapshotsOrderByWithRelationInput[] =
    props.body.sort
      ? props.body.sort === "created_at"
        ? [{ created_at: props.body.order === "asc" ? "asc" : "desc" }]
        : props.body.sort === "vote_score"
          ? [{ vote_score: props.body.order === "asc" ? "asc" : "desc" }]
          : props.body.sort === "comment_count"
            ? [{ comment_count: props.body.order === "asc" ? "asc" : "desc" }]
            : [{ created_at: "desc" }]
      : [{ created_at: "desc" }];
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_community_post_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      post_type: true,
      text_body: true,
      link_url: true,
      image_file_id: true,
      vote_score: true,
      comment_count: true,
      edited_by_member_id: true,
      created_at: true,
    },
  });
  if (data.length === 0) {
    throw new HttpException("No snapshots found", 404);
  }
  const total = await MyGlobal.prisma.reddit_community_post_snapshots.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (snapshot) => {
    const editedByMember: IRedditCommunityMember.ISummary = {
      id: snapshot.edited_by_member_id ?? "",
      username: "",
      created_at: toISOStringSafe(new Date()),
      profile: undefined,
      karma: 0,
    };
    return {
      id: snapshot.id,
      title: snapshot.title,
      post_type: snapshot.post_type,
      text_body: snapshot.text_body,
      link_url: snapshot.link_url === null ? null : snapshot.link_url,
      image_file_id:
        snapshot.image_file_id === null ? null : snapshot.image_file_id,
      vote_score: snapshot.vote_score,
      comment_count: snapshot.comment_count,
      edited_by_member_id: snapshot.edited_by_member_id,
      edited_by_member: editedByMember,
      created_at: toISOStringSafe(snapshot.created_at),
    } satisfies IRedditCommunityPostSnapshot.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityPostSnapshot.ISummary;
}
