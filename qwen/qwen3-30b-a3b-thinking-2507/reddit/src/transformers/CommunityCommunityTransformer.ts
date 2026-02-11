import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityCommunityTransformer {
  export type Payload = Prisma.community_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        owner: CommunityMemberAtSummaryTransformer.select(),
        community_moderators: true,
        community_posts: CommunityPostAtSummaryTransformer.select(),
        community_banned_users: true,
      },
    } satisfies Prisma.community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommunity> {
    return {
      name: input.name,
      description: input.description ?? undefined,
      icon_url: input.icon_url ?? undefined,
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      owner: await CommunityMemberAtSummaryTransformer.transform(input.owner),
      posts: await ArrayUtil.asyncMap(
        input.community_posts,
        CommunityPostAtSummaryTransformer.transform,
      ),
    };
  }
}
