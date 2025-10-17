import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentVote";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditLikeAdminCommentsCommentIdVotes(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IRedditLikeCommentVote.ICreate;
}): Promise<IRedditLikeCommentVote> {
  /**
   * SCHEMA-API CONTRADICTION DETECTED:
   *
   * API Specification Requirements:
   *
   * - Endpoint requires admin authorization (AdminPayload)
   * - Admin should be able to vote on comments
   *
   * Actual Prisma Schema:
   *
   * - Reddit_like_comment_votes.reddit_like_member_id: FK to reddit_like_members
   *   table
   * - No admin_id or actor_id field exists
   * - Schema only supports member voting, not admin voting
   *
   * The Problem:
   *
   * - Admin.id is from reddit_like_admins table
   * - Cannot use admin.id as reddit_like_member_id (foreign key constraint
   *   violation)
   * - Admin and Member IDs exist in separate table namespaces
   *
   * This is an irreconcilable contradiction between the API contract and
   * database schema. Cannot implement the requested logic without schema
   * changes.
   *
   * @todo Either:
   *
   *   1. Add actor_admin_id field to reddit_like_comment_votes table, OR
   *   2. Change API endpoint to require member authorization instead, OR
   *   3. Implement unified user table containing both members and admins
   */
  return typia.random<IRedditLikeCommentVote>();
}
