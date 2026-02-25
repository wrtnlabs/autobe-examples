import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformUserAtSummaryTransformer {
  export type Payload = Prisma.community_platform_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformUser.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name ?? null,
      avatar_url: input.avatar_url ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    };
  }
}
