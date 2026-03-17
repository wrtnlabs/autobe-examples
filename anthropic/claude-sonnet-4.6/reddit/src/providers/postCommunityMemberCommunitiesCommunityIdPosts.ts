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
import { CommunityPostCollector } from "../collectors/CommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdPosts(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  // 1. Validate community exists and is not soft-deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true },
  });
  // 2. Validate the member holds an active subscription to this community
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.member.id,
      community_community_id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (subscription === null) {
    throw new HttpException(
      "You must be subscribed to this community to create a post.",
      403,
    );
  }
  // 3. Validate the member is not currently banned from this community
  const banResults = await MyGlobal.prisma.$queryRaw<
    {
      id: string;
    }[]
  >`
    SELECT id FROM community_bans
    WHERE community_community_id = ${props.communityId}
      AND deleted_at IS NULL
      AND (
        member_id = ${props.member.id}
        OR community_member_id = ${props.member.id}
        OR banned_member_id = ${props.member.id}
      )
    LIMIT 1
  `;
  if (banResults.length > 0) {
    throw new HttpException(
      "You are banned from this community and cannot create posts.",
      403,
    );
  }
  // 4. Create the post record (and its type-specific child) via Collector
  const created = await MyGlobal.prisma.community_posts.create({
    data: await CommunityPostCollector.collect({
      body: props.body,
      communityCommunities: { id: props.communityId },
      communityMembers: { id: props.member.id },
      communityMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPostTransformer.select(),
  });
  // 5. Transform the created record to the full ICommunityPost response
  return CommunityPostTransformer.transform(created);
}
