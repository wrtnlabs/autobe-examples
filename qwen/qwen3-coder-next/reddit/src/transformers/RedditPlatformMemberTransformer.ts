import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberTransformer {
  export type Payload = Prisma.reddit_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        email_verified: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember> {
    return {
      id: input.id,
      email: input.email,
      email_verified: input.email_verified,
      username: input.username,
      display_name: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
