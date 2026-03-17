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
import { CommunityUserProfileTransformer } from "../transformers/CommunityUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityUserProfilesUserProfileId(props: {
  userProfileId: string & tags.Format<"uuid">;
}): Promise<ICommunityUserProfile> {
  const record = await MyGlobal.prisma.community_user_profiles.findFirstOrThrow(
    {
      where: {
        id: props.userProfileId,
        member: {
          deleted_at: null,
        },
      },
      ...CommunityUserProfileTransformer.select(),
    },
  );
  return await CommunityUserProfileTransformer.transform(record);
}
