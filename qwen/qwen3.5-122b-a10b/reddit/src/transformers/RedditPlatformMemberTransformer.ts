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
        username: true,
        display_name: true,
        bio: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        avatarFile: {
          select: {
            id: true,
            file_path: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      avatar:
        input.avatarFile && !input.avatarFile.deleted_at
          ? input.avatarFile.file_path
          : null,
      karma_score: Number(input.karma_score),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
