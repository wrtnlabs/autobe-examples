import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityUserProfileTransformer } from "../transformers/CommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityUserProfile.IUpdate;
}): Promise<ICommunityUserProfile> {
  const updateData = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.bio !== undefined && { bio: props.body.bio }),
    ...(props.body.avatar_url !== undefined && {
      avatar_url: props.body.avatar_url,
    }),
    updated_at: new Date(),
  } satisfies Prisma.community_user_profilesUpdateInput;
  const updated = await MyGlobal.prisma.community_user_profiles.update({
    where: { community_member_id: props.member.id },
    data: updateData,
    ...CommunityUserProfileTransformer.select(),
  });
  return CommunityUserProfileTransformer.transform(updated);
}
