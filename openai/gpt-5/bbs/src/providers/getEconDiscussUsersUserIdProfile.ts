import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";

export async function getEconDiscussUsersUserIdProfile(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IEconDiscussUserProfile> {
  const { userId } = props;

  const user = await MyGlobal.prisma.econ_discuss_users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      display_name: true,
      avatar_uri: true,
      timezone: true,
      locale: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      econ_discuss_user_profiles: {
        select: {
          bio: true,
          affiliation: true,
          website: true,
          location: true,
          deleted_at: true,
        },
      },
      econ_discuss_verified_experts: {
        select: { deleted_at: true },
      },
      econ_discuss_expert_domain_badges: {
        where: { deleted_at: null, revoked_at: null },
        select: { deleted_at: true, revoked_at: true },
      },
      econ_discuss_user_reputations: {
        select: { score: true, deleted_at: true },
      },
    },
  });

  if (!user) throw new HttpException("Not Found", 404);

  const profile = user.econ_discuss_user_profiles;
  if (!profile || profile.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  const isExpertVerified =
    (user.econ_discuss_verified_experts !== null &&
      user.econ_discuss_verified_experts.deleted_at === null) ||
    (user.econ_discuss_expert_domain_badges &&
      user.econ_discuss_expert_domain_badges.length > 0);

  const reputation =
    user.econ_discuss_user_reputations &&
    user.econ_discuss_user_reputations.deleted_at === null
      ? (user.econ_discuss_user_reputations.score as number &
          tags.Type<"int32"> &
          tags.Minimum<0>)
      : undefined;

  return {
    id: user.id as string & tags.Format<"uuid">,
    displayName: user.display_name,
    avatarUri:
      user.avatar_uri === null
        ? null
        : (user.avatar_uri as string & tags.Format<"uri">),
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    emailVerified: user.email_verified,
    bio: profile.bio ?? null,
    affiliation: profile.affiliation ?? null,
    website:
      profile.website === null
        ? null
        : (profile.website as string & tags.Format<"uri">),
    location: profile.location ?? null,
    isExpertVerified,
    reputation,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  };
}
