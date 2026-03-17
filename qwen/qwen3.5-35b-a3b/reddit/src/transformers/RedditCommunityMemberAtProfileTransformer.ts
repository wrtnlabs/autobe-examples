import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtProfileTransformer {
  export type Payload = Prisma.reddit_community_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        karmaSnapshots: true,
        avatar: {
          select: {
            file: {
              select: {
                file_path: true,
              },
            },
          },
        },
        profile: {
          select: {
            display_name: true,
            bio: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.IProfile> {
    return {
      username: input.username,
      display_name: input.profile?.display_name ?? undefined,
      bio: input.profile?.bio ?? undefined,
      avatar_image_url: input.avatar?.file?.file_path ?? null,
      karma: input.karmaSnapshots.length ?? 0,
      created_at: input.created_at.toISOString(),
    };
  }
}
