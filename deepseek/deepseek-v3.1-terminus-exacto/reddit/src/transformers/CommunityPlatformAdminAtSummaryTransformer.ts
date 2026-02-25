import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformAdminAtSummaryTransformer {
  export type Payload = Prisma.community_platform_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        permissions_level: true,
        is_active: true,
        last_login_at: true,
      },
    } satisfies Prisma.community_platform_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      permissions_level: input.permissions_level,
      is_active: input.is_active,
      last_login_at: input.last_login_at
        ? input.last_login_at.toISOString()
        : null,
    };
  }
}
