import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformGuestAtSummaryTransformer } from "./CommunityPlatformGuestAtSummaryTransformer";

export namespace CommunityPlatformGuestSessionTransformer {
  export type Payload = Prisma.community_platform_guest_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        user_agent: true,
        ip: true,
        href: true,
        referrer: true,
        guest: CommunityPlatformGuestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_guest_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformGuestSession> {
    return {
      id: input.id,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      guest: await CommunityPlatformGuestAtSummaryTransformer.transform(
        input.guest,
      ),
    };
  }
}
