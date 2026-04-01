import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        karma: {
          select: { current_score: true },
        } satisfies Prisma.reddit_community_user_karmasFindManyArgs,
        userAvatarFiles: {
          select: {
            id: true,
            created_at: true,
          },
        } satisfies Prisma.reddit_community_file_of_usersFindManyArgs,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.ISummary> {
    const file = input.userAvatarFiles?.[0] ?? undefined;
    return {
      id: input.id,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      profile:
        file !== undefined
          ? {
              id: file.id,
              display_name: "",
              bio: "",
              avatar_image_url: "",
              karma_score: 0,
              created_at: toISOStringSafe(file.created_at),
            }
          : undefined,
      karma:
        input.karma !== undefined && input.karma !== null
          ? Number(input.karma.current_score)
          : undefined,
    };
  }
}
