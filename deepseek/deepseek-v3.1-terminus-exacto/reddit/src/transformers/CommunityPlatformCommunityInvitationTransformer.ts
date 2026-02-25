import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityInvitation";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityInvitationTransformer {
  export type Payload =
    Prisma.community_platform_community_invitationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        message: true,
        expires_at: true,
        accepted_at: true,
        rejected_at: true,
        created_at: true,
        updated_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        inviter: CommunityPlatformUserAtSummaryTransformer.select(),
        invitee: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityInvitation> {
    return {
      id: input.id,
      status: input.status as "pending" | "accepted" | "rejected" | "expired",
      message: input.message ?? undefined,
      expires_at: input.expires_at.toISOString(),
      accepted_at: input.accepted_at?.toISOString() ?? undefined,
      rejected_at: input.rejected_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      inviter: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.inviter,
      ),
      invitee: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.invitee,
      ),
    };
  }
}
