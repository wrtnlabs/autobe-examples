import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberPasswordResetTransformer {
  export type Payload =
    Prisma.community_platform_member_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_member_id: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        revoked_at: true,
      },
    } satisfies Prisma.community_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMemberPasswordReset> {
    return {
      id: input.id,
      community_platform_member_id: input.community_platform_member_id,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      revoked_at: input.revoked_at?.toISOString() ?? null,
    };
  }
}
