import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMemberEmailVerification";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
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

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMemberEmailVerification.IRequest;
}): Promise<IPageITodoAppMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.todo_app_member_email_verificationsWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.token !== undefined ? { token: props.body.token } : {}),
    ...(props.body.verified === true
      ? { verified_at: { not: null } }
      : props.body.verified === false
        ? { verified_at: null }
        : {}),
    ...(props.body.expired === true || props.body.expired === false
      ? {
          expired_at:
            props.body.expired === true
              ? { lt: new Date() }
              : { gt: new Date() },
        }
      : {}),
  };
  const orderBy: Prisma.todo_app_member_email_verificationsOrderByWithRelationInput =
    props.body.sort === "expiredAt"
      ? { expired_at: props.body.order ?? "desc" }
      : props.body.sort === "verifiedAt"
        ? { verified_at: props.body.order ?? "desc" }
        : props.body.sort === "updatedAt"
          ? { updated_at: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" };
  const data =
    await MyGlobal.prisma.todo_app_member_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        token: true,
        verified_at: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const records =
    await MyGlobal.prisma.todo_app_member_email_verifications.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((row) => ({
      id: row.id,
      token: row.token,
      verified_at:
        row.verified_at === null ? null : row.verified_at.toISOString(),
      expired_at: row.expired_at.toISOString(),
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      deleted_at: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    })),
  };
}
