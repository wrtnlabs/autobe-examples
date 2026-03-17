import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformCommunityTransformer {
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunity> {
    return {
      id: input.id,
      member: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      slug: input.slug,
      title: input.title,
      description: input.description,
      status: input.status,
      subscriber_count: input.subscriptions.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        slug: true,
        title: true,
        description: true,
        status: true,
        subscriptions: {
          select: {},
        } satisfies Prisma.community_platform_subscriptionsFindManyArgs,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_communitiesFindManyArgs;
  }
  export type Payload = Prisma.community_platform_communitiesGetPayload<
    ReturnType<typeof select>
  >;
}
