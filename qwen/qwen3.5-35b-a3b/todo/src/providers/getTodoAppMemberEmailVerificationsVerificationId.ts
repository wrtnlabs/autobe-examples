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
import { TodoAppMemberEmailVerificationAtSummaryTransformer } from "../transformers/TodoAppMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberEmailVerification.ISummary> {
  const record =
    await MyGlobal.prisma.todo_app_member_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.verificationId,
          deleted_at: null,
        },
        ...TodoAppMemberEmailVerificationAtSummaryTransformer.select(),
      },
    );
  if (record.member?.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await TodoAppMemberEmailVerificationAtSummaryTransformer.transform(
    record,
  );
}
