import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityIconTransformer } from "../transformers/RedditCommunityCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberCommunitiesCommunityNameIcon(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCommunityCommunityIcon.IUpdate;
}): Promise<IRedditCommunityCommunityIcon> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: {
        id: true,
        reddit_community_member_id: true,
      },
    });
  if (community.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingIcon =
    await MyGlobal.prisma.reddit_community_community_icons.findFirst({
      where: {
        reddit_community_community_id: community.id,
        deleted_at: null,
      },
    });
  if (existingIcon) {
    await MyGlobal.prisma.reddit_community_community_icons.update({
      where: { id: existingIcon.id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
  const created = await MyGlobal.prisma.reddit_community_community_icons.create(
    {
      data: {
        id: v4(),
        reddit_community_community_id: community.id,
        storage_key: props.body.storage_key ?? "",
        original_filename: props.body.original_filename ?? "",
        mime_type: props.body.mime_type ?? "",
        file_size: props.body.file_size ?? 0,
        width: props.body.width ?? null,
        height: props.body.height ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...RedditCommunityCommunityIconTransformer.select(),
    },
  );
  return await RedditCommunityCommunityIconTransformer.transform(created);
}
