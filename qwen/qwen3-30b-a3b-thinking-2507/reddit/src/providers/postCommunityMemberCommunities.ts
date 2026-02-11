import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommunityCollector } from "../collectors/CommunityCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommunityTransformer } from "../transformers/CommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityCommunity.ICreate;
}): Promise<ICommunityCommunity> {
  const collected = await CommunityCommunityCollector.collect({
    body: props.body,
    communityMembers: props.member,
  });
  const created = await MyGlobal.prisma.community_communities.create({
    data: collected,
    ...CommunityCommunityTransformer.select(),
  });
  return await CommunityCommunityTransformer.transform(created);
}
