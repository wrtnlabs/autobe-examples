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

export async function putCommunityPlatformUserEmailVerificationsId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ICommunityPlatformUserEmailVerification.IUpdate;
}): Promise<ICommunityPlatformUserEmailVerification> {
  const record =
    await MyGlobal.prisma.community_platform_user_email_verifications.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );
  if (record.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated =
    await MyGlobal.prisma.community_platform_user_email_verifications.update({
      where: { id: props.id },
      data: {
        ...(props.body.token !== undefined && { token: props.body.token }),
        ...(props.body.is_verified !== undefined && {
          is_verified: props.body.is_verified,
        }),
        ...(props.body.expires_at !== undefined && {
          expires_at: props.body.expires_at,
        }),
        ...(props.body.created_at !== undefined && {
          created_at: props.body.created_at,
        }),
        ...(props.body.updated_at !== undefined && {
          updated_at: props.body.updated_at,
        }),
        // For deleted_at field, explicitly set to nullable date or null
        deleted_at:
          props.body.deleted_at === undefined
            ? undefined
            : props.body.deleted_at,
      },
      ...CommunityPlatformUserEmailVerificationTransformer.select(),
    });
  return await CommunityPlatformUserEmailVerificationTransformer.transform(
    updated,
  );
}
