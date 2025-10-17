import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostVote";
import { IEEconDiscussVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteType";
import { IEEconDiscussVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteStatus";
import { IEEconDiscussVoteSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussVoteSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEEconDiscussPostVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteType";
import { IEEconDiscussPostVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPostVoteStatus";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberMeVotes(props: {
  member: MemberPayload;
  body: IEconDiscussPostVote.IRequest;
}): Promise<IPageIEconDiscussPostVote.ISummary> {
  const { member, body } = props;

  // Pagination defaults (1-based page)
  const current = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 20);
  const skip = (current - 1) * limit;

  // Build where condition (allowed pattern for reuse)
  const whereCondition = {
    deleted_at: null,
    econ_discuss_user_id: member.id,
    // Optional filters
    ...(body.voteType !== undefined &&
      body.voteType !== null && {
        vote_type: body.voteType,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.postId !== undefined &&
      body.postId !== null && {
        econ_discuss_post_id: body.postId,
      }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && {
                gte: body.createdFrom,
              }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && {
                lte: body.createdTo,
              }),
          },
        }
      : {}),
    // Ensure top-level user not soft-deleted
    user: { is: { deleted_at: null } },
  };

  const sortBy = body.sortBy ?? "createdAt";
  const sortOrder = body.sortOrder ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_votes.findMany({
      where: whereCondition,
      select: {
        id: true,
        econ_discuss_post_id: true,
        vote_type: true,
        status: true,
        created_at: true,
      },
      orderBy:
        sortBy === "updatedAt"
          ? { updated_at: sortOrder === "asc" ? "asc" : "desc" }
          : { created_at: sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_post_votes.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / (limit || 1))),
    },
    data: rows.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      postId: r.econ_discuss_post_id as string & tags.Format<"uuid">,
      voteType: r.vote_type as IEEconDiscussPostVoteType,
      status: r.status as IEEconDiscussPostVoteStatus,
      createdAt: toISOStringSafe(r.created_at),
    })),
  };
}
