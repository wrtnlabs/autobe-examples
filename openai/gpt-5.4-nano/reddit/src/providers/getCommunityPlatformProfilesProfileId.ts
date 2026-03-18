import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformUserProfileTransformer } from "../transformers/CommunityPlatformUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformProfilesProfileId(props: {
  profileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserProfile> {
  return MyGlobal.prisma.$transaction(async (tx) => {
    const profile = await tx.community_platform_user_profiles.findUniqueOrThrow(
      {
        where: { id: props.profileId },
        select: {
          id: true,
          display_name: true,
          bio: true,
          avatar_uri: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          community_platform_member_id: true,
          member: CommunityPlatformMemberAtSummaryTransformer.select(),
        },
      },
    );
    if (profile.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const [posts, comments] = await Promise.all([
      tx.community_platform_posts.findMany({
        where: {
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
      tx.community_platform_comments.findMany({
        where: {
          deleted_at: null,
        },
        orderBy: { created_at: "desc" },
        take: 50,
      }),
    ]);
    const karma = 0;
    return {
      ...(await CommunityPlatformUserProfileTransformer.transform(
        profile as any,
      )),
      karma,
      posts: posts as any,
      comments: comments as any,
    };
  });
}
