import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import { IPageIDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAppeal";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchDiscussionBoardAdministratorAppeals(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardAppeal.IRequest;
}): Promise<IPageIDiscussionBoardAppeal> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  const [appeals, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_appeals.findMany({
      where: {
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.reviewing_administrator_id !== undefined &&
          body.reviewing_administrator_id !== null && {
            reviewing_administrator_id: body.reviewing_administrator_id,
          }),
        ...(body.decision !== undefined &&
          body.decision !== null && {
            decision: body.decision,
          }),
        ...(body.submitted_from !== undefined &&
          body.submitted_from !== null &&
          body.submitted_to !== undefined &&
          body.submitted_to !== null && {
            submitted_at: {
              gte: body.submitted_from,
              lte: body.submitted_to,
            },
          }),
        ...(body.submitted_from !== undefined &&
          body.submitted_from !== null &&
          (body.submitted_to === undefined || body.submitted_to === null) && {
            submitted_at: {
              gte: body.submitted_from,
            },
          }),
        ...((body.submitted_from === undefined ||
          body.submitted_from === null) &&
          body.submitted_to !== undefined &&
          body.submitted_to !== null && {
            submitted_at: {
              lte: body.submitted_to,
            },
          }),
      },
      orderBy:
        body.sort_by === "submitted_at"
          ? { submitted_at: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "reviewed_at"
            ? { reviewed_at: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "status"
              ? { status: body.sort_order === "asc" ? "asc" : "desc" }
              : body.sort_by === "decision"
                ? { decision: body.sort_order === "asc" ? "asc" : "desc" }
                : { submitted_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_appeals.count({
      where: {
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.member_id !== undefined &&
          body.member_id !== null && {
            member_id: body.member_id,
          }),
        ...(body.reviewing_administrator_id !== undefined &&
          body.reviewing_administrator_id !== null && {
            reviewing_administrator_id: body.reviewing_administrator_id,
          }),
        ...(body.decision !== undefined &&
          body.decision !== null && {
            decision: body.decision,
          }),
        ...(body.submitted_from !== undefined &&
          body.submitted_from !== null &&
          body.submitted_to !== undefined &&
          body.submitted_to !== null && {
            submitted_at: {
              gte: body.submitted_from,
              lte: body.submitted_to,
            },
          }),
        ...(body.submitted_from !== undefined &&
          body.submitted_from !== null &&
          (body.submitted_to === undefined || body.submitted_to === null) && {
            submitted_at: {
              gte: body.submitted_from,
            },
          }),
        ...((body.submitted_from === undefined ||
          body.submitted_from === null) &&
          body.submitted_to !== undefined &&
          body.submitted_to !== null && {
            submitted_at: {
              lte: body.submitted_to,
            },
          }),
      },
    }),
  ]);

  const transformedAppeals: IDiscussionBoardAppeal[] = appeals.map(
    (appeal) => ({
      id: appeal.id,
      appeal_explanation: appeal.appeal_explanation,
      additional_evidence: appeal.additional_evidence ?? undefined,
      status: appeal.status,
      decision: appeal.decision ?? undefined,
      decision_reasoning: appeal.decision_reasoning ?? undefined,
      corrective_action_taken: appeal.corrective_action_taken ?? undefined,
      submitted_at: toISOStringSafe(appeal.submitted_at),
      reviewed_at: appeal.reviewed_at
        ? toISOStringSafe(appeal.reviewed_at)
        : undefined,
      created_at: toISOStringSafe(appeal.created_at),
      updated_at: toISOStringSafe(appeal.updated_at),
    }),
  );

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: transformedAppeals,
  };
}
