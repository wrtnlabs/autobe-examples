import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponse";
import { IEEconDiscussPollResponseStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussPollResponseStatus";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussPollResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPollResponse";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussPollResponseOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPollResponseOption";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchEconDiscussModeratorPostsPostIdPollResponses(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPollResponse.IRequest;
}): Promise<IPageIEconDiscussPollResponse> {
  const { moderator, postId, body } = props;

  // Authorization: ensure moderator still active and base user is verified & not deleted
  const mod = await MyGlobal.prisma.econ_discuss_moderators.findFirst({
    where: {
      user_id: moderator.id,
      deleted_at: null,
      user: {
        is: {
          deleted_at: null,
          email_verified: true,
        },
      },
    },
  });
  if (mod === null) throw new HttpException("Forbidden", 403);

  // Locate poll for the post
  const poll = await MyGlobal.prisma.econ_discuss_polls.findFirst({
    where: {
      econ_discuss_post_id: postId,
      deleted_at: null,
    },
  });
  if (poll === null)
    throw new HttpException("Not Found: Poll not found for post", 404);

  // Pagination
  const page = Number(body.page ?? 1);
  const pageSizeCap = 200;
  const pageSize = Math.min(Number(body.pageSize ?? 20), pageSizeCap);
  const skip = (page - 1) * pageSize;

  // Fetch responses and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_poll_responses.findMany({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
        ...(body.statuses !== undefined &&
          body.statuses.length > 0 && {
            status: { in: body.statuses },
          }),
        ...(body.dateFrom !== undefined || body.dateTo !== undefined
          ? {
              created_at: {
                ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
                ...(body.dateTo !== undefined && { lte: body.dateTo }),
              },
            }
          : {}),
      },
      orderBy:
        body.sortBy === "status"
          ? { status: body.sortOrder === "asc" ? "asc" : "desc" }
          : body.sortBy === "updated_at"
            ? { updated_at: body.sortOrder === "asc" ? "asc" : "desc" }
            : { created_at: body.sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.econ_discuss_poll_responses.count({
      where: {
        econ_discuss_poll_id: poll.id,
        deleted_at: null,
        ...(body.statuses !== undefined &&
          body.statuses.length > 0 && {
            status: { in: body.statuses },
          }),
        ...(body.dateFrom !== undefined || body.dateTo !== undefined
          ? {
              created_at: {
                ...(body.dateFrom !== undefined && { gte: body.dateFrom }),
                ...(body.dateTo !== undefined && { lte: body.dateTo }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Load selections for found responses
  const responseIds = rows.map((r) => r.id);
  const selectionsByResponse = new Map<
    string,
    IEconDiscussPollResponseOption.ISummary[]
  >();
  if (responseIds.length > 0) {
    const selectionRows =
      await MyGlobal.prisma.econ_discuss_poll_response_options.findMany({
        where: {
          econ_discuss_poll_response_id: { in: responseIds },
          deleted_at: null,
        },
        orderBy: { created_at: "asc" },
      });
    for (const s of selectionRows) {
      const list =
        selectionsByResponse.get(s.econ_discuss_poll_response_id) ?? [];
      list.push({
        id: s.id as string & tags.Format<"uuid">,
        optionId: s.econ_discuss_poll_option_id as string & tags.Format<"uuid">,
        position: s.position ?? null,
      });
      selectionsByResponse.set(s.econ_discuss_poll_response_id, list);
    }
  }

  // Map rows to DTO
  const data: IEconDiscussPollResponse[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    pollId: r.econ_discuss_poll_id as string & tags.Format<"uuid">,
    userId: r.econ_discuss_user_id as string & tags.Format<"uuid">,
    status: r.status as IEEconDiscussPollResponseStatus,
    likertValue: r.likert_value ?? null,
    numericValue: r.numeric_value ?? null,
    withdrawnAt: r.withdrawn_at ? toISOStringSafe(r.withdrawn_at) : null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
    selections: selectionsByResponse.get(r.id) ?? [],
  }));

  const pages = Math.ceil(total / pageSize);
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Number(pages),
    },
    data,
  };
}
