import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformVoteCollector } from "../collectors/CommunityPlatformVoteCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteTransformer } from "../transformers/CommunityPlatformVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberVotes(props: {
  member: MemberPayload;
  body: ICommunityPlatformVote.ICreate;
}): Promise<ICommunityPlatformVote> {
  const existingVote = await MyGlobal.prisma.community_platform_votes.findFirst(
    {
      where: {
        user_id: props.member.id,
        votable_id: props.body.votable_id,
        deleted_at: null,
      },
    },
  );
  if (existingVote) {
    throw new HttpException("Duplicate vote found", 409);
  }
  const created = await MyGlobal.prisma.community_platform_votes.create({
    data: await CommunityPlatformVoteCollector.collect({
      body: props.body,
      communityPlatformMembers: { id: props.member.id },
    }),
    ...CommunityPlatformVoteTransformer.select(),
  });
  return await CommunityPlatformVoteTransformer.transform(created);
}
