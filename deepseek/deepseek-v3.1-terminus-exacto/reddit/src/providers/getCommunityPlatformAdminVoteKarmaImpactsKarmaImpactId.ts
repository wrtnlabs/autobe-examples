import { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminVoteKarmaImpactsKarmaImpactId(props: {
  admin: AdminPayload;
  karmaImpactId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteKarmaImpact> {
  const karmaImpact =
    await MyGlobal.prisma.community_platform_vote_karma_impacts.findUniqueOrThrow(
      {
        where: { id: props.karmaImpactId },
        select: {
          id: true,
          karma_delta: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma: true,
              email_verified: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            } satisfies Prisma.community_platform_usersSelect,
          },
        },
      },
    );
  return typia.assert<ICommunityPlatformVoteKarmaImpact>({
    id: karmaImpact.id,
    karmaDelta: karmaImpact.karma_delta,
    created_at: toISOStringSafe(karmaImpact.created_at),
    updated_at: toISOStringSafe(karmaImpact.updated_at),
    user: {
      id: karmaImpact.user.id,
      email: karmaImpact.user.email,
      username: karmaImpact.user.username,
      display_name: karmaImpact.user.display_name ?? undefined,
      bio: karmaImpact.user.bio ?? undefined,
      avatar_url: karmaImpact.user.avatar_url ?? undefined,
      karma: karmaImpact.user.karma,
      email_verified: karmaImpact.user.email_verified,
      created_at: toISOStringSafe(karmaImpact.user.created_at),
      updated_at: toISOStringSafe(karmaImpact.user.updated_at),
      deleted_at: karmaImpact.user.deleted_at
        ? toISOStringSafe(karmaImpact.user.deleted_at)
        : null,
    },
  });
}
