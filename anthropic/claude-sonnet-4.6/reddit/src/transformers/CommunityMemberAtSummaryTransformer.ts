import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        profile: {
          select: {
            display_name: true,
            avatar_url: true,
            karma_score: true,
          },
        },
      },
    } satisfies Prisma.community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.profile?.display_name ?? null,
      avatar_url: input.profile?.avatar_url ?? null,
      karma_score: input.profile?.karma_score ?? 0,
      created_at: toISOStringSafe(input.created_at),
    };
  }
}
