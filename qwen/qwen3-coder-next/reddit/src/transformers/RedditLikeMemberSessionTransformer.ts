import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberSessionTransformer {
  export type Payload = Prisma.reddit_like_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        revoked_at: true,
      },
    } satisfies Prisma.reddit_like_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      expired_at: input.expired_at?.toISOString() ?? undefined,
      revoked_at: input.revoked_at?.toISOString() ?? undefined,
    };
  }
}
