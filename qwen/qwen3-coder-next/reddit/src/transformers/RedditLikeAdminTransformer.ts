import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeAdminTransformer {
  export type Payload = Prisma.reddit_like_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
      },
    } satisfies Prisma.reddit_like_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeAdmin> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma_score: input.karma_score,
    };
  }
}
