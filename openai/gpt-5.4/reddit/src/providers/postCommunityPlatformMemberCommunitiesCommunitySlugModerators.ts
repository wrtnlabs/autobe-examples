import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunitySlugModerators(props: {
  member: MemberPayload;
  communitySlug: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        slug: props.communitySlug,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_member_id: true,
      },
    });
  if (community.community_platform_member_id !== props.member.id) {
    const authority =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_platform_community_id: community.id,
          community_platform_member_id: props.member.id,
          status: "active",
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (authority === null) throw new HttpException("Forbidden", 403);
  }
  const created =
    await MyGlobal.prisma.community_platform_community_moderators.create({
      data: await CommunityPlatformCommunityModeratorCollector.collect({
        body: props.body,
        community: {
          id: community.id,
        },
        grantedByMember: {
          id: props.member.id,
        },
      }),
      ...CommunityPlatformCommunityModeratorTransformer.select(),
    });
  return await CommunityPlatformCommunityModeratorTransformer.transform(
    created,
  );
}
