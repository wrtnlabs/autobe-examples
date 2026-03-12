import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneMemberSessionTransformer {
  export type Payload = Prisma.reddit_clone_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        ip: true,
        href: true,
        user_agent: true,
        referrer: true,
        access_token_expires_at: true,
        refresh_token_expires_at: true,
        created_at: true,
        expired_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberSession> {
    return {
      id: input.id,
      ip: input.ip,
      href: input.href,
      user_agent: input.user_agent ?? null,
      referrer: input.referrer ?? null,
      access_token_expires_at: input.access_token_expires_at.toISOString(),
      refresh_token_expires_at: input.refresh_token_expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
