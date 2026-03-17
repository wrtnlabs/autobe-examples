import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformCommunitySnapshotAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        status: true,
        visibility: true,
        is_nsfw: true,
        is_archived: true,
        is_locked: true,
        member_count: true,
        subscriber_count: true,
        post_count: true,
        comment_count: true,
        created_at: true,
        owner_member_id: true,
        community: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
      },
    } satisfies Prisma.community_platform_community_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunitySnapshot.ISummary> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? undefined,
      type: input.type,
      status: input.status,
      visibility: input.visibility,
      is_nsfw: input.is_nsfw,
      is_archived: input.is_archived,
      is_locked: input.is_locked,
      member_count: input.member_count,
      subscriber_count: input.subscriber_count,
      post_count: input.post_count,
      comment_count: input.comment_count,
      owner_member: /* Need to load member */ null as any,
      created_at: input.created_at.toISOString(),
    };
  }
}
