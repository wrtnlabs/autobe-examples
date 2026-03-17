import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminEmailVerificationsEmailVerificationId(props: {
  admin: AdminPayload;
  emailVerificationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformMemberEmailVerification.IUpdate;
}): Promise<ICommunityPlatformMemberEmailVerification> {
  await MyGlobal.prisma.community_platform_member_email_verifications.findFirstOrThrow(
    {
      where: {
        id: props.emailVerificationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  throw new HttpException("Forbidden", 403);
}
