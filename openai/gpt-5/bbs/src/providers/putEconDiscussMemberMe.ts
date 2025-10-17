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

export async function putEconDiscussMemberMe(props: {
  member: MemberPayload;
  body: IEconDiscussUserProfile.IUpdate;
}): Promise<IEconDiscussUserProfile> {
  const { member, body } = props;

  const existingUser = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: { id: member.id, deleted_at: null },
  });
  if (!existingUser) {
    throw new HttpException("Forbidden: Inactive or missing account", 403);
  }

  const now = toISOStringSafe(new Date());

  const updatedUser = await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      display_name: body.displayName ?? undefined,
      avatar_uri:
        body.avatarUri === null ? null : (body.avatarUri ?? undefined),
      timezone: body.timezone === null ? null : (body.timezone ?? undefined),
      locale: body.locale === null ? null : (body.locale ?? undefined),
      updated_at: now,
    },
  });

  const profile = await MyGlobal.prisma.econ_discuss_user_profiles.upsert({
    where: { user_id: member.id },
    update: {
      bio: body.bio === null ? null : (body.bio ?? undefined),
      affiliation:
        body.affiliation === null ? null : (body.affiliation ?? undefined),
      website: body.website === null ? null : (body.website ?? undefined),
      location: body.location === null ? null : (body.location ?? undefined),
      updated_at: now,
    },
    create: {
      id: v4(),
      user_id: member.id,
      bio: body.bio ?? null,
      affiliation: body.affiliation ?? null,
      website: body.website ?? null,
      location: body.location ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  const expertCount = await MyGlobal.prisma.econ_discuss_verified_experts.count(
    {
      where: { user_id: member.id, deleted_at: null },
    },
  );

  return {
    id: member.id,
    displayName: updatedUser.display_name,
    timezone: updatedUser.timezone ?? null,
    locale: updatedUser.locale ?? null,
    emailVerified: updatedUser.email_verified,
    bio: profile.bio ?? null,
    affiliation: profile.affiliation ?? null,
    location: profile.location ?? null,
    isExpertVerified: expertCount > 0,
    createdAt: toISOStringSafe(updatedUser.created_at),
    updatedAt: toISOStringSafe(updatedUser.updated_at),
  };
}
