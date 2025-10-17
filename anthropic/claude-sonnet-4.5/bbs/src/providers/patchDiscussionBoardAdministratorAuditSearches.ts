import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchHistory";
import { IPageIDiscussionBoardSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSearchHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorAuditSearches(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSearchHistory.IRequest;
}): Promise<IPageIDiscussionBoardSearchHistory> {
  const { body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_search_history.findMany({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.search_query_keyword !== undefined &&
          body.search_query_keyword !== null && {
            search_query: {
              contains: body.search_query_keyword,
            },
          }),
        ...((body.min_results !== undefined && body.min_results !== null) ||
        (body.max_results !== undefined && body.max_results !== null)
          ? {
              results_count: {
                ...(body.min_results !== undefined &&
                  body.min_results !== null && { gte: body.min_results }),
                ...(body.max_results !== undefined &&
                  body.max_results !== null && { lte: body.max_results }),
              },
            }
          : {}),
        ...(body.has_clicked_result !== undefined &&
          body.has_clicked_result !== null && {
            clicked_result_id:
              body.has_clicked_result === true
                ? { not: null }
                : { equals: null },
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && { gte: body.date_from }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && { lte: body.date_to }),
              },
            }
          : {}),
        ...(body.session_id !== undefined &&
          body.session_id !== null && {
            session_id: body.session_id,
          }),
      },
      orderBy:
        body.sort_by === "results_count"
          ? { results_count: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "search_query"
            ? { search_query: body.sort_order === "asc" ? "asc" : "desc" }
            : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_search_history.count({
      where: {
        ...(body.user_id !== undefined &&
          body.user_id !== null && {
            user_id: body.user_id,
          }),
        ...(body.search_query_keyword !== undefined &&
          body.search_query_keyword !== null && {
            search_query: {
              contains: body.search_query_keyword,
            },
          }),
        ...((body.min_results !== undefined && body.min_results !== null) ||
        (body.max_results !== undefined && body.max_results !== null)
          ? {
              results_count: {
                ...(body.min_results !== undefined &&
                  body.min_results !== null && { gte: body.min_results }),
                ...(body.max_results !== undefined &&
                  body.max_results !== null && { lte: body.max_results }),
              },
            }
          : {}),
        ...(body.has_clicked_result !== undefined &&
          body.has_clicked_result !== null && {
            clicked_result_id:
              body.has_clicked_result === true
                ? { not: null }
                : { equals: null },
          }),
        ...((body.date_from !== undefined && body.date_from !== null) ||
        (body.date_to !== undefined && body.date_to !== null)
          ? {
              created_at: {
                ...(body.date_from !== undefined &&
                  body.date_from !== null && { gte: body.date_from }),
                ...(body.date_to !== undefined &&
                  body.date_to !== null && { lte: body.date_to }),
              },
            }
          : {}),
        ...(body.session_id !== undefined &&
          body.session_id !== null && {
            session_id: body.session_id,
          }),
      },
    }),
  ]);

  const mappedData: IDiscussionBoardSearchHistory[] = data.map((record) => ({
    id: record.id,
    user_id: record.user_id ?? undefined,
    search_query: record.search_query,
    filters_applied: record.filters_applied ?? undefined,
    results_count: record.results_count,
    clicked_result_id: record.clicked_result_id ?? undefined,
    session_id: record.session_id ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: mappedData,
  };
}
