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
  const {
    email,
    status,
    createdAtFrom,
    createdAtTo,
    expiredAtFrom,
    expiredAtTo,
    page = 1,
    limit = 20,
  } = props.body;
  if (limit > 100) {
    throw new HttpException("Limit should not exceed 100", 400);
  }
  const whereConditions: any = {
    deleted_at: null,
  };
  if (email) {
    whereConditions.registered_user = {
      is: {
        email,
        deleted_at: null,
      },
    };
  }
  if (createdAtFrom || createdAtTo) {
    whereConditions.created_at = {};
    if (createdAtFrom) {
      whereConditions.created_at.gte = createdAtFrom;
    }
    if (createdAtTo) {
      whereConditions.created_at.lte = createdAtTo;
    }
  }
  if (expiredAtFrom || expiredAtTo) {
    whereConditions.expired_at = {};
    if (expiredAtFrom) {
      whereConditions.expired_at.gte = expiredAtFrom;
    }
    if (expiredAtTo) {
      whereConditions.expired_at.lte = expiredAtTo;
    }
  }
  const nowISOString = new Date().toISOString();
  if (status) {
    switch (status) {
      case "valid":
        whereConditions.expired_at = { gte: nowISOString };
        whereConditions.deleted_at = null;
        break;
      case "expired":
        whereConditions.expired_at = { lt: nowISOString };
        break;
      case "used":
        whereConditions.deleted_at = { not: null };
        break;
      case "invalid":
        whereConditions.OR = [
          { deleted_at: { not: null } },
          { expired_at: { lt: nowISOString } },
        ];
        break;
    }
  }
  const skip = (page - 1) * limit;
  const [total, records] = await Promise.all([
    MyGlobal.prisma.discussion_board_registered_user_email_verifications.count({
      where: whereConditions,
    }),
    MyGlobal.prisma.discussion_board_registered_user_email_verifications.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          token: true,
          expired_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    ),
  ]);
  const data = records.map((rec) => ({
    id: rec.id,
    token: rec.token,
    expired_at: rec.expired_at ? toISOStringSafe(rec.expired_at) : null,
    created_at: toISOStringSafe(rec.created_at),
    updated_at: toISOStringSafe(rec.updated_at),
    deleted_at: rec.deleted_at ? toISOStringSafe(rec.deleted_at) : null,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
