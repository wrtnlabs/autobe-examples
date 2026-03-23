import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeMemberSessionAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
        access_token: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        refresh_token: true,
        access_token_expires_at: true,
        refresh_token_expires_at: true,
        expired_at: true,
        revoked_at: true,
      },
    } satisfies Prisma.reddit_like_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberSession.ISummary> {
    return {
      id: input.id,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      access_token: input.access_token,
      ip: input.ip,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
