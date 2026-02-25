import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditProfileSnapshot";
import { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
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

export async function patchRedditMemberSnapshots(props: {
  member: MemberPayload;
  body: IRedditProfileSnapshot.IRequest;
}): Promise<IPageIRedditProfileSnapshot.ISummary> {
  const page = Number(props.body.page) || 1;
  const limit = Math.min(Number(props.body.limit) || 10, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_comment_snapshotsWhereInput = {};
  if (props.body.reddit_comment_id) {
    where.reddit_comment_id = props.body.reddit_comment_id;
    if (props.body.post_id) {
      where.post_id = props.body.post_id;
      if (props.body.author_id) {
        where.author_id = props.body.author_id;
        if (props.body.created_at_min || props.body.created_at_max) {
          if (props.body.created_at_min) {
            where.created_at = { gte: props.body.created_at_min };
            if (props.body.created_at_max) {
              where.created_at = {
                ...where.created_at,
                lte: props.body.created_at_max,
              };
            }
          }
        }
      }
    }
  }
  if (props.body.deleted !== undefined) {
    if (props.body.deleted) {
      where.deleted_at = { not: null };
    }
  }
  const data = await MyGlobal.prisma.reddit_comment_snapshots.findMany({
    where,
    skip,
    take: limit,
    select: {
      content: true,
      post_id: true,
      author_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_comment_snapshots.count({ where });
  const transformedData = data.map((snap) => ({
    content: snap.content,
    post_id: snap.post_id,
    author_id: snap.author_id,
    created_at: toISOStringSafe(snap.created_at),
    updated_at: toISOStringSafe(snap.updated_at),
    deleted_at: snap.deleted_at ? toISOStringSafe(snap.deleted_at) : null,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
