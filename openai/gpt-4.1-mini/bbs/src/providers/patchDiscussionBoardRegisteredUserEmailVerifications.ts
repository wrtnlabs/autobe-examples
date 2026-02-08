import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserEmailVerifications(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardRegisteredUserEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardRegisteredUserEmailVerification.ISummary> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: {
    deleted_at: null;
  } = {
    deleted_at: null,
  };
  const data =
    await MyGlobal.prisma.discussion_board_registered_user_email_verifications.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          registered_user_id: true,
          token: true,
          expired_at: true,
          created_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_registered_user_email_verifications.count(
      { where },
    );
  return {
    data: data.map((record) => ({
      id: record.id,
      registered_user_id: record.registered_user_id,
      token: record.token,
      expired_at: record.expired_at,
      created_at: record.created_at,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
