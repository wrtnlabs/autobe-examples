import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityTransformer } from "../transformers/RedditPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunity.IUpdate;
}): Promise<IRedditPlatformCommunity> {
  // Step 1-2: Query community and verify it exists
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Step 3: Verify community is not soft-deleted
  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 410);
  }
  // Step 4: Verify ownership
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 5: Check name uniqueness if name is provided
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.reddit_platform_communities.findFirst({
        where: {
          name: props.body.name,
          id: {
            not: props.communityId,
          },
          deleted_at: null,
        },
      });
    if (existing !== null) {
      throw new HttpException("Community name already exists", 409);
    }
  }
  // Step 6: Build update data
  const updateData: {
    name?: string | undefined;
    description?: string | null | undefined;
    icon_url?: (string & tags.Format<"uri">) | null | undefined;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.icon_url !== undefined) {
    updateData.icon_url = props.body.icon_url;
  }
  // Step 7: Execute update
  const updated = await MyGlobal.prisma.reddit_platform_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // Step 8: Re-query with transformer select
  const result =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditPlatformCommunityTransformer.select(),
    });
  // Step 9: Transform and return
  return await RedditPlatformCommunityTransformer.transform(result);
}
