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
import { MultiUserTodoMemberEmailVerificationTransformer } from "../transformers/MultiUserTodoMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoMemberEmailVerification> {
  const nowIso = toISOStringSafe(new Date());
  const verification =
    await MyGlobal.prisma.multi_user_todo_member_email_verifications.findUnique(
      {
        where: { id: props.verificationId },
        ...MultiUserTodoMemberEmailVerificationTransformer.select(),
      },
    );
  if (verification === null) {
    throw new HttpException("Verification token is unavailable", 404);
  }
  if (verification.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Verification token is unavailable", 404);
  }
  if (verification.deleted_at !== null) {
    throw new HttpException("Verification token is revoked", 403);
  }
  if (toISOStringSafe(verification.expired_at) < nowIso) {
    throw new HttpException("Verification token is expired", 403);
  }
  return await MultiUserTodoMemberEmailVerificationTransformer.transform(
    verification,
  );
}
