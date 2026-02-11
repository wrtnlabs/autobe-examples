import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunitySystemHealthLogTransformer {
  export type Payload = Prisma.reddit_community_system_health_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        component: true,
        message: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_community_system_health_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunitySystemHealthLog> {
    return {
      id: input.id,
      status: input.status,
      component: input.component,
      message: input.message,
      metadata: input.metadata ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}
