import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityBanTransformer } from "../transformers/RedditCloneCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCloneCommunityBan.ICreate;
}): Promise<IRedditCloneCommunityBan> {
  // Validate name uniqueness before creation
  const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.body.name },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Community name already exists", 400);
  }
  // Create community
  const created = await MyGlobal.prisma.reddit_clone_communities.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.member.id } },
    },
    ...RedditCloneCommunityBanTransformer.select(),
  });
  // Transform and return
  return await RedditCloneCommunityBanTransformer.transform(created);
}
