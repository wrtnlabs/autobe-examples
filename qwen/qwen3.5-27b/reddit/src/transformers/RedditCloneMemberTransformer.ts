import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneMemberTransformer {
  export type Payload = Prisma.reddit_clone_membersGetPayload<
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
        profile: {
          select: {
            display_name: true,
            bio: true,
            avatar: true,
            karma: true,
          },
        } satisfies Prisma.reddit_clone_user_profilesFindManyArgs,
      },
    } satisfies Prisma.reddit_clone_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditCloneMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      display_name: input.profile?.display_name ?? "",
      bio: input.profile?.bio ?? null,
      avatar: input.profile?.avatar ?? null,
      karma: input.profile?.karma ?? 0,
    };
  }
}
