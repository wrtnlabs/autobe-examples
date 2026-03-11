import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberEmailVerificationTransformer } from "../transformers/DiscussionBoardMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_member_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId },
        ...DiscussionBoardMemberEmailVerificationTransformer.select(),
      },
    );
  if (verification.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await DiscussionBoardMemberEmailVerificationTransformer.transform(
    verification,
  );
}
