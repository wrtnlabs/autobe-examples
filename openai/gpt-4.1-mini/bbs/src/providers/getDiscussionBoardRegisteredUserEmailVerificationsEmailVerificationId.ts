import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardRegisteredUserEmailVerificationTransformer } from "../transformers/DiscussionBoardRegisteredUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserEmailVerificationsEmailVerificationId(props: {
  registeredUser: RegistereduserPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardRegisteredUserEmailVerification> {
  const record =
    await MyGlobal.prisma.discussion_board_registered_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.emailVerificationId },
        ...DiscussionBoardRegisteredUserEmailVerificationTransformer.select(),
      },
    );
  return await DiscussionBoardRegisteredUserEmailVerificationTransformer.transform(
    record,
  );
}
