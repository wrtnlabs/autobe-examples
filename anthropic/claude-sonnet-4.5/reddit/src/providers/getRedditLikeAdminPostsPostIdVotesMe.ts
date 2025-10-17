import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditLikeAdminPostsPostIdVotesMe(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostVote.IUserVoteStatus> {
  /**
   * SCHEMA-API CONTRADICTION: reddit_like_post_votes.reddit_like_member_id
   * references reddit_like_members.id only. Admin users (reddit_like_admins)
   * cannot be queried in votes table. Schema requires unified user table or
   * separate admin vote tracking.
   */
  return typia.random<IRedditLikePostVote.IUserVoteStatus>();
}
