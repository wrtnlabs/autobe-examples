import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSectionAdministratorCollector } from "../collectors/DiscussionBoardSectionAdministratorCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionAdministratorTransformer } from "../transformers/DiscussionBoardSectionAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSectionsSectionIdAssignments(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.ICreate;
}): Promise<IDiscussionBoardSectionAdministrator> {
  // Validate section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  if (section.status !== "active") {
    throw new HttpException("Section is not active", 400);
  }
  // Validate that either admin or super admin is specified, but not both
  const hasAdmin =
    props.body.discussion_board_admin_id !== undefined &&
    props.body.discussion_board_admin_id !== null;
  const hasSuperAdmin =
    props.body.discussion_board_super_admin_id !== undefined &&
    props.body.discussion_board_super_admin_id !== null;
  if (!hasAdmin && !hasSuperAdmin) {
    throw new HttpException(
      "Either regular administrator or super administrator must be specified",
      400,
    );
  }
  if (hasAdmin && hasSuperAdmin) {
    throw new HttpException(
      "Cannot specify both regular administrator and super administrator",
      400,
    );
  }
  // Validate administrator exists
  if (hasAdmin) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.discussion_board_admin_id! },
    });
    if (!admin) {
      throw new HttpException("Regular administrator not found", 404);
    }
  } else if (hasSuperAdmin) {
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUnique({
        where: { id: props.body.discussion_board_super_admin_id! },
      });
    if (!superAdmin) {
      throw new HttpException("Super administrator not found", 404);
    }
  }
  // Check for existing assignment
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        discussion_board_section_id: props.sectionId,
        OR: [
          {
            discussion_board_admin_id:
              props.body.discussion_board_admin_id || undefined,
          },
          {
            discussion_board_super_admin_id:
              props.body.discussion_board_super_admin_id || undefined,
          },
        ],
        deleted_at: null,
      },
    });
  if (existingAssignment) {
    throw new HttpException(
      "Administrator is already assigned to this section",
      409,
    );
  }
  // Create the assignment using collector
  const created =
    await MyGlobal.prisma.discussion_board_section_administrators.create({
      data: await DiscussionBoardSectionAdministratorCollector.collect({
        body: props.body,
        section: { id: props.sectionId },
      }),
      ...DiscussionBoardSectionAdministratorTransformer.select(),
    });
  return await DiscussionBoardSectionAdministratorTransformer.transform(
    created,
  );
}
