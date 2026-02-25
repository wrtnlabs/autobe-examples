import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserEmailVerificationTransformer } from "../transformers/CommunityPlatformUserEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserEmailVerificationsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserEmailVerification> {
  const record =
    await MyGlobal.prisma.community_platform_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...CommunityPlatformUserEmailVerificationTransformer.select(),
      },
    );
  return await CommunityPlatformUserEmailVerificationTransformer.transform(
    record,
  );
}
