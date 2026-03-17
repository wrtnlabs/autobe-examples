import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySnapshotCollector } from "../collectors/CommunityPlatformCommunitySnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunitySnapshotTransformer } from "../transformers/CommunityPlatformCommunitySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunitySlugSnapshots(props: {
  member: MemberPayload;
  communitySlug: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.ICreate;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        slug: props.communitySlug,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        deleted_at: true,
      },
    });
  if (community.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (community.deleted_at !== null) {
    throw new HttpException(
      "Community is not available for snapshot creation",
      400,
    );
  }
  const created =
    await MyGlobal.prisma.community_platform_community_snapshots.create({
      data: await CommunityPlatformCommunitySnapshotCollector.collect({
        body: props.body,
        community: {
          id: community.id,
        } satisfies IEntity,
      }),
      ...CommunityPlatformCommunitySnapshotTransformer.select(),
    });
  return await CommunityPlatformCommunitySnapshotTransformer.transform(created);
}
