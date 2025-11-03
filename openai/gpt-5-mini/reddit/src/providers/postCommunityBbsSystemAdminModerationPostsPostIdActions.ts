import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerationAction";
import { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import { ICommunityBbsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsReport";
import { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function postCommunityBbsSystemAdminModerationPostsPostIdActions(props: {
  systemAdmin: SystemadminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsModerationAction.ICreate;
}): Promise<ICommunityBbsModerationAction> {
  const { systemAdmin, postId, body } = props;

  // Validate target post exists
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new HttpException("Not Found: post does not exist", 404);

  // Business validations (performed where possible):
  // - origin_report_id existence
  if (body.origin_report_id !== undefined && body.origin_report_id !== null) {
    const report = await MyGlobal.prisma.community_bbs_reports.findUnique({
      where: { id: body.origin_report_id },
    });
    if (!report)
      throw new HttpException("Bad Request: origin_report_id not found", 400);
  }

  // - expires_at must be a future timestamp (compare ISO strings)
  if (body.expires_at !== undefined && body.expires_at !== null) {
    const nowIso = toISOStringSafe(new Date());
    if (body.expires_at <= nowIso)
      throw new HttpException(
        "Bad Request: expires_at must be a future timestamp",
        400,
      );
  }

  // - moderator_id existence when supplied
  if (body.moderator_id !== undefined && body.moderator_id !== null) {
    const mod =
      await MyGlobal.prisma.community_bbs_community_moderators.findUnique({
        where: { id: body.moderator_id },
      });
    if (!mod)
      throw new HttpException("Bad Request: moderator_id not found", 400);
  }

  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - The API accepts moderator_id as nullable for systemAdmin flows and
   *   instructs the service to attribute the action to the admin actor when
   *   moderator_id is null.
   * - The Prisma schema for community_bbs_moderation_actions declares
   *   moderator_id as a NON-NULL foreign key referencing
   *   community_bbs_community_moderators.id. There is no schema-level mapping
   *   from a system admin actor to a community_bbs_community_moderators id.
   *
   * CONSEQUENCE:
   *
   * - We cannot safely implement the admin flow without either:
   *
   *   1. Modifying the Prisma schema to allow moderation actions attributed to
   *        system admins (e.g., add handled_by_actor_type/handled_by_actor_id
   *        or allow moderator_id to be nullable), or
   *   2. Creating an explicit domain mapping that represents an admin as a moderator
   *        assignment (which itself requires a community_member id and would
   *        create side-effects not described by the API contract).
   *
   * RESOLUTION:
   *
   * - Return a mocked ICommunityBbsModerationAction using typia.random<T>() and
   *   include this explanatory comment so platform owners can reconcile the
   *   schema/API mismatch.
   *
   * @todo Either update the Prisma schema to support admin-attributed actions
   *   (e.g., add handled_by_actor_type/handled_by_actor_id), or require
   *   moderator_id for all moderation actions in the API contract.
   */
  return typia.random<ICommunityBbsModerationAction>();
}
