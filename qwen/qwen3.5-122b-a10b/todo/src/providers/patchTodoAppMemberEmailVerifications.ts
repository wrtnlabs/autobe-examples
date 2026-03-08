import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberEmailVerificationTransformer } from "../transformers/TodoAppMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMemberEmailVerification.IRequest;
}): Promise<ITodoAppMemberEmailVerification> {
  const now = new Date();
  const verification =
    await MyGlobal.prisma.todo_app_member_email_verifications.findFirst({
      where: {
        token: props.body.token,
        todo_app_member_id: props.member.id,
        verified_at: null,
        expires_at: { gt: now },
        deleted_at: null,
      },
      ...TodoAppMemberEmailVerificationTransformer.select(),
    });
  if (verification === null) {
    throw new HttpException("Invalid or expired verification token", 400);
  }
  await MyGlobal.prisma.todo_app_member_email_verifications.update({
    where: { id: verification.id },
    data: {
      verified_at: now,
      updated_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.todo_app_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: verification.id },
        ...TodoAppMemberEmailVerificationTransformer.select(),
      },
    );
  return await TodoAppMemberEmailVerificationTransformer.transform(updated);
}
