import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardUserEmailVerificationTransformer } from "../transformers/DiscussionBoardUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_user_email_verifications.findUnique({
      where: {
        id: props.verificationId,
        discussion_board_user_id: props.user.id, // Ensure user owns this verification
      },
      ...DiscussionBoardUserEmailVerificationTransformer.select(),
    });
  if (!verification) {
    throw new HttpException("Email verification not found", 404);
  }
  return await DiscussionBoardUserEmailVerificationTransformer.transform(
    verification,
  );
}
