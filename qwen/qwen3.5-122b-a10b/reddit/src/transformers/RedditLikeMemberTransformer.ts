import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberTransformer {
  export type Payload = Prisma.reddit_like_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        userProfile: {
          select: {
            display_name: true,
            bio: true,
            avatar: true,
            karma_score: true,
          },
        },
      },
    } satisfies Prisma.reddit_like_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.userProfile?.display_name ?? "",
      bio: input.userProfile?.bio ?? "",
      avatar: input.userProfile?.avatar ?? "",
      karma_score: input.userProfile?.karma_score ?? 0,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IRedditLikeMember;
  }
}
