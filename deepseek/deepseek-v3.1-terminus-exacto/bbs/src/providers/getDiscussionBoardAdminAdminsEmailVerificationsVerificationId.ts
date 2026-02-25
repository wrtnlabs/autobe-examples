import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminEmailVerificationTransformer } from "../transformers/DiscussionBoardAdminEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdminsEmailVerificationsVerificationId(props: {
  admin: AdminPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_admin_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId },
        ...DiscussionBoardAdminEmailVerificationTransformer.select(),
      },
    );
  return await DiscussionBoardAdminEmailVerificationTransformer.transform(
    verification,
  );
}
