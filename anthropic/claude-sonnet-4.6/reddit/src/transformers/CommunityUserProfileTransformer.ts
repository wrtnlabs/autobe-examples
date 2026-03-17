import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityUserProfileTransformer {
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
        updated_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_user_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityUserProfile> {
    return {
      id: input.id,
      communityMemberId: input.member.id,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      displayName: input.display_name ?? null,
      bio: input.bio ?? null,
      avatarUrl: input.avatar_url ?? null,
      karmaScore: input.karma_score,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
