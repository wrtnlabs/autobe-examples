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
import { CommunityPlatformMemberEmailVerificationTransformer } from "../transformers/CommunityPlatformMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminEmailVerificationsEmailVerificationId(props: {
  admin: AdminPayload;
  emailVerificationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformMemberEmailVerification> {
  const emailVerification =
    await MyGlobal.prisma.community_platform_member_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.emailVerificationId,
          deleted_at: null,
        },
        ...CommunityPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  return await CommunityPlatformMemberEmailVerificationTransformer.transform(
    emailVerification,
  );
}
