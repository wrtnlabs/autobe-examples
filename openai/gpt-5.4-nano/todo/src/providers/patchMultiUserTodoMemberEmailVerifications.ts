import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
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

export async function patchMultiUserTodoMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberEmailVerification.ICreate;
}): Promise<IMultiUserTodoMemberEmailVerification.IInvert> {
  const verification =
    await MyGlobal.prisma.multi_user_todo_member_email_verifications.findUniqueOrThrow(
      {
        where: {
          token: props.body.token,
        },
        select: {
          id: true,
          token: true,
          email: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          expired_at: true,
          multi_user_todo_member_id: true,
          member: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      } satisfies Prisma.multi_user_todo_member_email_verificationsFindUniqueArgs,
    );
  const expiredAtIso = toISOStringSafe(verification.expired_at);
  if (
    verification.multi_user_todo_member_id !== props.member.id ||
    verification.deleted_at !== null ||
    expiredAtIso <= "2026-03-18T06:21:45.677Z"
  ) {
    throw new HttpException("Invalid verification token", 400);
  }
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.multi_user_todo_member_email_verifications.update({
      where: { token: props.body.token },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    return await tx.multi_user_todo_member_email_verifications.findUniqueOrThrow(
      {
        where: { token: props.body.token },
        select: {
          id: true,
          token: true,
          email: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          expired_at: true,
          multi_user_todo_member_id: true,
          member: {
            select: {
              id: true,
              email: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      } satisfies Prisma.multi_user_todo_member_email_verificationsFindUniqueArgs,
    );
  });
  return {
    id: updated.id as string & tags.Format<"uuid">,
    token: updated.token,
    email: updated.email,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
    expired_at: toISOStringSafe(updated.expired_at),
    member: {
      id: updated.member?.id as IMultiUserTodoMember.ISummary["id"],
      email: updated.member?.email as IMultiUserTodoMember.ISummary["email"],
      created_at: updated.member?.created_at
        ? (toISOStringSafe(
            updated.member.created_at,
          ) as IMultiUserTodoMember.ISummary["created_at"])
        : undefined,
      updated_at: updated.member?.updated_at
        ? (toISOStringSafe(
            updated.member.updated_at,
          ) as IMultiUserTodoMember.ISummary["updated_at"])
        : undefined,
      deleted_at:
        updated.member?.deleted_at === null
          ? null
          : updated.member?.deleted_at
            ? (toISOStringSafe(
                updated.member.deleted_at,
              ) as IMultiUserTodoMember.ISummary["deleted_at"])
            : undefined,
    } satisfies IMultiUserTodoMember.ISummary,
  };
}
