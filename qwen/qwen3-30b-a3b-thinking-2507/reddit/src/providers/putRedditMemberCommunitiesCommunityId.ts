import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityTransformer } from "../transformers/RedditCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunity.IUpdate;
}): Promise<IRedditCommunity> {
  const community = await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  if (community.reddit_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: new Date(),
    },
  });
  const updatedCommunity =
    await MyGlobal.prisma.reddit_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCommunityTransformer.select(),
    });
  return await RedditCommunityTransformer.transform(updatedCommunity);
}
