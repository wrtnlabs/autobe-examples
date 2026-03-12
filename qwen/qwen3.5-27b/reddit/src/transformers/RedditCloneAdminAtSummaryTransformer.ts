import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneAdminAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        created_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_clone_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneAdmin.ISummary> {
    return {
      id: input.id,
      username: input.username,
      email: input.email,
      display_name: input.display_name,
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
