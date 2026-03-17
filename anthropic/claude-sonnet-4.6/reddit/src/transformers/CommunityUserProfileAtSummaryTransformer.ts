import { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityUserProfileAtSummaryTransformer {
  export type Payload = Prisma.community_user_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        member: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    } satisfies Prisma.community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityUserProfile.ISummary> {
    return {
      id: input.id,
      community_member_id: input.member.id,
      username: input.member.username,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
    };
  }
}
