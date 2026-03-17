import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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
  // Step 1: Reject if a community with the same name already exists (active records only)
  const existing = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("A community with this name already exists.", 409);
  }
  // Step 2: Insert new community row using Collector for data, Transformer for select
  const created = await MyGlobal.prisma.community_communities.create({
    data: await CommunityCommunityCollector.collect({
      body: props.body,
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityCommunityTransformer.select(),
  });
  // Step 3: Transform DB record into full ICommunityCommunity response DTO
  return await CommunityCommunityTransformer.transform(created);
}
