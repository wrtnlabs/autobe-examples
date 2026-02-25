import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminEmailVerificationTransformer } from "../transformers/DiscussionBoardSuperAdminEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSuperAdminsEmailVerificationsVerificationId(props: {
  superAdmin: SuperAdminPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSuperAdminEmailVerification> {
  const verification =
    await MyGlobal.prisma.discussion_board_super_admin_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.verificationId },
        ...DiscussionBoardSuperAdminEmailVerificationTransformer.select(),
      },
    );
  return await DiscussionBoardSuperAdminEmailVerificationTransformer.transform(
    verification,
  );
}
