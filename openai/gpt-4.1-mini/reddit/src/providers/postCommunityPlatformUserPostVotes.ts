import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteCollector } from "../collectors/CommunityPlatformPostVoteCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserPostVotes(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVote.ICreate;
}): Promise<ICommunityPlatformPostVote> {
  // Cast props.body to object with required properties vote_type and postId for collector
  const ofType = props.body as {
    vote_type: string;
    postId: string;
  } & ICommunityPlatformPostVote.ICreate;
  const data = await CommunityPlatformPostVoteCollector.collect({
    body: ofType,
  });
  const created = await MyGlobal.prisma.community_platform_post_votes.create({
    data,
  });
  return {
    id: created.id,
    post_id: created.post_id,
    vote_type: created.vote_type,
    created_at: created.created_at ? toISOStringSafe(created.created_at) : null,
    updated_at: created.updated_at ? toISOStringSafe(created.updated_at) : null,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
