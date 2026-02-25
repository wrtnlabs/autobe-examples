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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSuperAdminTransformer } from "../transformers/DiscussionBoardSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdAdministrators(props: {
  superAdmin: SuperAdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSuperAdmin.ICreate;
}): Promise<IDiscussionBoardSuperAdmin> {
  // Validate section exists and is active
  const section =
    await MyGlobal.prisma.discussion_board_sections.findUniqueOrThrow({
      where: { id: props.sectionId, deleted_at: null },
    });
  // Validate either admin_id or super_admin_id is provided (mutually exclusive)
  const adminIdCount = [props.body.admin_id, props.body.super_admin_id].filter(
    (x) => x !== undefined && x !== null,
  ).length;
  if (adminIdCount !== 1) {
    throw new HttpException(
      "Must provide exactly one of admin_id or super_admin_id",
      400,
    );
  }
  // Validate target administrator exists
  if (props.body.admin_id) {
    const targetAdmin =
      await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: props.body.admin_id, deleted_at: null },
      });
    if (!targetAdmin) {
      throw new HttpException("Target administrator not found", 404);
    }
  }
  if (props.body.super_admin_id) {
    const targetSuperAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUnique({
        where: { id: props.body.super_admin_id, deleted_at: null },
      });
    if (!targetSuperAdmin) {
      throw new HttpException("Target super administrator not found", 404);
    }
  }
  // Check for existing assignment conflict
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        deleted_at: { equals: null },
        OR: [
          {
            admin: props.body.admin_id
              ? { id: props.body.admin_id, deleted_at: null }
              : undefined,
            section: { id: props.sectionId, deleted_at: null },
          },
          {
            superAdmin: props.body.super_admin_id
              ? { id: props.body.super_admin_id, deleted_at: null }
              : undefined,
            section: { id: props.sectionId, deleted_at: null },
          },
        ],
      },
    });
  if (existingAssignment) {
    throw new HttpException(
      "Administrator is already assigned to this section",
      409,
    );
  }
  // Create assignment using Collector
  const assignment =
    await MyGlobal.prisma.discussion_board_section_administrators.create({
      data: await DiscussionBoardSuperAdminCollector.collect({
        body: props.body,
        discussionBoardSections: { id: props.sectionId },
        discussionBoardAdmins: { id: props.superAdmin.id },
      }),
      ...DiscussionBoardSuperAdminTransformer.select(),
    });
  return await DiscussionBoardSuperAdminTransformer.transform(assignment);
}
