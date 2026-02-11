import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityAdminAtSummaryTransformer {
  export type Payload = Prisma.community_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        display_name: true,
        avatar_url: true,
      },
    } satisfies Prisma.community_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityAdmin.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name ?? null,
      avatar_url: input.avatar_url ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
