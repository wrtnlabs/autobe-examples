import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMeProfile(props: {
  member: MemberPayload;
}): Promise<IEconDiscussUserProfile> {
  const user = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: props.member.id, deleted_at: null },
    select: {
      id: true,
      display_name: true,
      avatar_uri: true,
      timezone: true,
      locale: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) {
    throw new HttpException("Not Found", 404);
  }

  const [profile, verifiedExpertRow, expertBadgeRow, reputationRow] =
    await Promise.all([
      MyGlobal.prisma.econ_discuss_user_profiles.findFirst({
        where: { user_id: props.member.id, deleted_at: null },
        select: {
          bio: true,
          affiliation: true,
          website: true,
          location: true,
        },
      }),
      MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
        where: { user_id: props.member.id, deleted_at: null },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_expert_domain_badges.findFirst({
        where: { user_id: props.member.id, deleted_at: null },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
        where: { user_id: props.member.id, deleted_at: null },
        select: { score: true },
      }),
    ]);

  const result: IEconDiscussUserProfile = {
    id: typia.assert<string & tags.Format<"uuid">>(user.id),
    displayName: user.display_name,
    avatarUri:
      user.avatar_uri !== null
        ? typia.assert<string & tags.Format<"uri">>(user.avatar_uri)
        : null,
    timezone: user.timezone ?? null,
    locale: user.locale ?? null,
    emailVerified: user.email_verified,
    bio: profile?.bio ?? null,
    affiliation: profile?.affiliation ?? null,
    website:
      profile?.website !== undefined && profile?.website !== null
        ? typia.assert<string & tags.Format<"uri">>(profile.website)
        : null,
    location: profile?.location ?? null,
    isExpertVerified: Boolean(verifiedExpertRow || expertBadgeRow),
    reputation:
      reputationRow &&
      reputationRow.score !== null &&
      reputationRow.score !== undefined
        ? typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
            reputationRow.score,
          )
        : undefined,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
  };

  return result;
}
