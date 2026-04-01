import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtProfileTransformer {
  export type Payload = Prisma.reddit_community_usersGetPayload<{
    select: {
      id: true;
      username: true;
      created_at: true;
      karmaSnapshots: {
        select: {
          karma_after_change: true;
          created_at: true;
        };
      };
      profile: {
        select: {
          display_name: true;
          bio: true;
        };
      };
      avatar: {
        select: {
          file: {
            select: {
              file_path: true;
            };
          };
        };
      };
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        karmaSnapshots: {
          select: {
            karma_after_change: true,
            created_at: true,
          },
        },
        profile: {
          select: {
            display_name: true,
            bio: true,
          },
        },
        avatar: {
          select: {
            file: {
              select: {
                file_path: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.reddit_community_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.IProfile> {
    const sortedSnapshots = [...input.karmaSnapshots].sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
    const karma = sortedSnapshots[0]?.karma_after_change ?? 0;
    return {
      username: input.username,
      display_name: input.profile?.display_name,
      bio: input.profile?.bio,
      avatar_image_url: input.avatar?.file?.file_path ?? null,
      karma,
      created_at: input.created_at.toISOString(),
    };
  }
}
