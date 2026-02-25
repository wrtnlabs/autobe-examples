import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminCollector } from "../collectors/DiscussionBoardSuperAdminCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdAdministrators(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.ICreate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Validate section exists
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId, deleted_at: null },
    });
  // Validate exactly one of admin_id or super_admin_id is provided
  if (
    (props.body.admin_id === undefined || props.body.admin_id === null) &&
    (props.body.super_admin_id === undefined ||
      props.body.super_admin_id === null)
  ) {
    throw new HttpException(
      "Either admin_id or super_admin_id must be provided",
      400,
    );
  }
  if (
    props.body.admin_id !== undefined &&
    props.body.admin_id !== null &&
    props.body.super_admin_id !== undefined &&
    props.body.super_admin_id !== null
  ) {
    throw new HttpException(
      "Cannot provide both admin_id and super_admin_id",
      400,
    );
  }
  // Validate target administrator exists if provided
  if (props.body.admin_id !== undefined && props.body.admin_id !== null) {
    const targetAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
        where: { id: props.body.admin_id, deleted_at: null },
      });
  }
  if (
    props.body.super_admin_id !== undefined &&
    props.body.super_admin_id !== null
  ) {
    const targetSuperAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUniqueOrThrow({
        where: { id: props.body.super_admin_id, deleted_at: null },
      });
  }
  // Check for existing assignment to prevent conflict
  if (props.body.admin_id !== undefined && props.body.admin_id !== null) {
    const existing =
      await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
        where: {
          discussion_board_admin_id_discussion_board_section_id: {
            discussion_board_admin_id: props.body.admin_id,
            discussion_board_section_id: props.sectionId,
          },
        },
      });
    if (existing) {
      throw new HttpException(
        "Administrator already assigned to this section",
        409,
      );
    }
  }
  if (
    props.body.super_admin_id !== undefined &&
    props.body.super_admin_id !== null
  ) {
    const existing =
      await MyGlobal.prisma.discussion_board_section_administrators.findUnique({
        where: {
          discussion_board_super_admin_id_discussion_board_section_id: {
            discussion_board_super_admin_id: props.body.super_admin_id,
            discussion_board_section_id: props.sectionId,
          },
        },
      });
    if (existing) {
      throw new HttpException(
        "Super administrator already assigned to this section",
        409,
      );
    }
  }
  // Create assignment using collector
  const created =
    await MyGlobal.prisma.discussion_board_section_administrators.create({
      data: await DiscussionBoardSuperAdminCollector.collect({
        body: props.body,
        discussionBoardSections: { id: props.sectionId },
        discussionBoardAdmins: {
          id: props.admin.id,
          // Removed session_id as it's not part of IEntity type
        },
      }),
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardSuperAdminTransformer.transform(created);
}
