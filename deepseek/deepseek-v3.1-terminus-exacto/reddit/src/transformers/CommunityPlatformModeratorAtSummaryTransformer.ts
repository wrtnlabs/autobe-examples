import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformModeratorAtSummaryTransformer {
  export type Payload = Prisma.community_platform_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        avatar_url: true,
        is_active: true,
        permission_level: true,
        last_login_at: true,
      },
    } satisfies Prisma.community_platform_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      avatar_url: input.avatar_url ?? null,
      is_active: input.is_active,
      permission_level: input.permission_level,
      last_login_at: input.last_login_at
        ? input.last_login_at.toISOString()
        : null,
    };
  }
}
