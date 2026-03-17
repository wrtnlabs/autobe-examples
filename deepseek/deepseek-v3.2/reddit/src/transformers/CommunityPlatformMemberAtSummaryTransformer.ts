import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        email_verified: true,
        registered_at: true,
        last_login_at: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      nickname: input.nickname ?? undefined,
      email_verified: input.email_verified,
      registered_at: input.registered_at.toISOString(),
      last_login_at: input.last_login_at?.toISOString() ?? undefined,
    };
  }
}
