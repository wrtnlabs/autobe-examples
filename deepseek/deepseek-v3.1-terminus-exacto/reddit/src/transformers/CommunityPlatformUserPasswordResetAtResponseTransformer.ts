import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformUserPasswordResetAtResponseTransformer {
  export type Payload =
    Prisma.community_platform_user_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    } satisfies Prisma.community_platform_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUserPasswordReset.IResponse> {
    return {
      token: process.env.NODE_ENV === "production" ? undefined : input.token,
      expires_at: toISOStringSafe(input.expires_at),
      email: input.user.email,
    };
  }
}
