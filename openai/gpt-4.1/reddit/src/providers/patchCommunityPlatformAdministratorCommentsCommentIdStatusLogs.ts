import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentStatusLog";
import { IPageICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentStatusLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorCommentsCommentIdStatusLogs(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentStatusLog.IRequest;
}): Promise<IPageICommunityPlatformCommentStatusLog> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {
    comment_id: props.commentId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reason !== undefined &&
      props.body.reason !== null && {
        reason: { contains: props.body.reason },
      }),
    ...(props.body.user_session_id !== undefined &&
      props.body.user_session_id !== null && {
        user_session_id: props.body.user_session_id,
      }),
    ...(props.body.start_time || props.body.end_time
      ? {
          created_at: {
            ...(props.body.start_time ? { gte: props.body.start_time } : {}),
            ...(props.body.end_time ? { lte: props.body.end_time } : {}),
          },
        }
      : {}),
  };

  const orderBy = [
    { [props.body.order_by]: props.body.order_direction },
    { id: "desc" as const },
  ];

  const [data, records] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_status_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_comment_status_logs.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((log) => ({
      id: log.id,
      comment_id: log.comment_id,
      user_session_id: log.user_session_id,
      status: log.status,
      reason: log.reason === null ? null : log.reason,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
