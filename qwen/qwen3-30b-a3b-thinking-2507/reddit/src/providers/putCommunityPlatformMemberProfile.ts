import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileTransformer } from "../transformers/CommunityPlatformProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfile.IUpdate;
}): Promise<ICommunityPlatformProfile> {
  const profile = await MyGlobal.prisma.community_platform_profiles.findUnique({
    where: {
      community_platform_members_id: props.member.id,
    },
  });
  if (!profile) {
    return await CommunityPlatformProfileTransformer.transform(
      await MyGlobal.prisma.community_platform_profiles.create({
        data: {
          id: v4(),
          community_platform_members_id: props.member.id,
          display_name: props.body.display_name ?? null,
          bio: props.body.bio ?? null,
          avatar_url: props.body.avatar_url ?? null,
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      }),
    );
  }
  return await CommunityPlatformProfileTransformer.transform(
    await MyGlobal.prisma.community_platform_profiles.update({
      where: { id: profile.id },
      data: {
        display_name: props.body.display_name ?? null,
        bio: props.body.bio ?? null,
        avatar_url: props.body.avatar_url ?? null,
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  );
}
