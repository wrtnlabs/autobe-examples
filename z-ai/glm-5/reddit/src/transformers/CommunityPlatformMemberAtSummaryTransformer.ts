import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember.ISummary> {
    // Avatar requires polymorphic owner relation (owner_type='user_avatar')
    // which has no direct Prisma relation - service layer should handle separately
    return {
      id: input.id,
      username: input.username,
      displayName: input.display_name,
      bio: input.bio,
      karma: input.karma,
      avatar: null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
