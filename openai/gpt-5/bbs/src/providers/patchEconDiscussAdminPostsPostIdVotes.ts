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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconDiscussAdminPostsPostIdVotes(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostVote.IRequest;
}): Promise<IPageIEconDiscussPostVote.ISummary> {
  const { admin, postId, body } = props;

  // Authorization: ensure active admin assignment with soft-delete guards and 2FA policy
  const adminRow = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: {
        is: {
          deleted_at: null,
        },
      },
      OR: [
        { enforced_2fa: false },
        {
          AND: [
            { enforced_2fa: true },
            { user: { is: { mfa_enabled: true } } },
          ],
        },
      ],
    },
  });
  if (adminRow === null) {
    throw new HttpException("Forbidden", 403);
  }

  // Validate post existence (and not soft-deleted)
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
    select: { id: true },
  });
  if (!post) throw new HttpException("Not Found", 404);

  // If body.postId provided, it must match the path parameter for consistency
  if (
    body.postId !== undefined &&
    body.postId !== null &&
    body.postId !== postId
  ) {
    throw new HttpException(
      "Bad Request: postId in body must match path parameter",
      400,
    );
  }

  // Pagination defaults
  const page = Number(body.page ?? 1);
  const pageSize = Number(body.pageSize ?? 20);
  const skip = (page - 1) * pageSize;

  // Sorting defaults
  const sortBy = body.sortBy ?? "createdAt";
  const sortOrder = body.sortOrder ?? "desc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_post_votes.findMany({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
        ...(body.voteType !== undefined &&
          body.voteType !== null && {
            vote_type: body.voteType,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
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
      },
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
      take: pageSize,
    }),
    MyGlobal.prisma.econ_discuss_post_votes.count({
      where: {
        econ_discuss_post_id: postId,
        deleted_at: null,
        ...(body.voteType !== undefined &&
          body.voteType !== null && {
            vote_type: body.voteType,
          }),
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
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
      },
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    postId: r.econ_discuss_post_id as string & tags.Format<"uuid">,
    voteType: (r.vote_type === "up"
      ? "up"
      : "down") as IEEconDiscussPostVoteType,
    status: ((): IEEconDiscussPostVoteStatus => {
      switch (r.status) {
        case "active":
        case "withdrawn":
        case "switched":
        case "discounted":
        case "invalidated":
          return r.status as IEEconDiscussPostVoteStatus;
        default:
          return "active";
      }
    })(),
    createdAt: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(Math.ceil(total / (pageSize || 1))),
    },
    data,
  };
}
