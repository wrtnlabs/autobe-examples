import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        email_verified: true,
        created_at: true,
      },
    } satisfies Prisma.reddit_like_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      emailVerified: input.email_verified,
      createdAt: input.created_at.toISOString(),
    };
  }
}
