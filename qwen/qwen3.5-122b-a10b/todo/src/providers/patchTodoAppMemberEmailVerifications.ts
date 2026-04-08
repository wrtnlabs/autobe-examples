import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppMemberEmailVerificationAtVerifyResponseTransformer } from "../transformers/TodoAppMemberEmailVerificationAtVerifyResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberEmailVerifications(props: {
  member: MemberPayload;
  body: ITodoAppMemberEmailVerification.IVerify;
}): Promise<ITodoAppMemberEmailVerification.IVerifyResponse> {
  // Find the verification record that matches the token, member, and is pending
  const record =
    await MyGlobal.prisma.todo_app_member_email_verifications.findFirstOrThrow({
      where: {
        token: props.body.token,
        todo_app_member_id: props.member.id,
        verified_at: null,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
      },
    });
  // Update the verified_at timestamp
  await MyGlobal.prisma.todo_app_member_email_verifications.update({
    where: { id: record.id },
    data: {
      verified_at: new Date(),
    },
  });
  // Fetch the updated record with all fields needed for the response
  const updated =
    await MyGlobal.prisma.todo_app_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: record.id },
        ...TodoAppMemberEmailVerificationAtVerifyResponseTransformer.select(),
      },
    );
  // Transform and return the response
  return await TodoAppMemberEmailVerificationAtVerifyResponseTransformer.transform(
    updated,
  );
}
