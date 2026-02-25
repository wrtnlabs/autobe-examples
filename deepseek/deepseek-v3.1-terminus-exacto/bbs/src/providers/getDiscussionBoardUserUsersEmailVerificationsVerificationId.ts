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

export async function getDiscussionBoardUserUsersEmailVerificationsVerificationId(props: {
  user: UserPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardUserEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId },
        ...DiscussionBoardUserEmailVerificationTransformer.select(),
      },
    );
  return await DiscussionBoardUserEmailVerificationTransformer.transform(
    verification,
  );
}
