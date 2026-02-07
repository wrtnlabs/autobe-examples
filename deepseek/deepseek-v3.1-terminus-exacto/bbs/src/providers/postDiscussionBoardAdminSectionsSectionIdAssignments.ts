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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSectionAdministratorTransformer } from "../transformers/DiscussionBoardSectionAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSectionsSectionIdAssignments(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSectionAdministrator.ICreate;
}): Promise<IDiscussionBoardSectionAdministrator> {
  // Validate that the section exists and is active
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: { id: props.sectionId },
  });
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  if (section.status !== "active") {
    throw new HttpException("Section is not active", 400);
  }
  // Check for duplicate assignment
  const existingAssignment =
    await MyGlobal.prisma.discussion_board_section_administrators.findFirst({
      where: {
        OR: [
          {
            discussion_board_admin_id:
              props.body.discussion_board_admin_id ?? undefined,
            discussion_board_section_id: props.sectionId,
          },
          {
            discussion_board_super_admin_id:
              props.body.discussion_board_super_admin_id ?? undefined,
            discussion_board_section_id: props.sectionId,
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
  // Validate that the referenced administrator exists
  if (props.body.discussion_board_admin_id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.discussion_board_admin_id },
    });
    if (!admin) {
      throw new HttpException("Referenced administrator not found", 404);
    }
  }
  if (props.body.discussion_board_super_admin_id) {
    const superAdmin =
      await MyGlobal.prisma.discussion_board_super_admins.findUnique({
        where: { id: props.body.discussion_board_super_admin_id },
      });
    if (!superAdmin) {
      throw new HttpException("Referenced super administrator not found", 404);
    }
  }
  // Ensure only one type of administrator is specified
  if (
    props.body.discussion_board_admin_id &&
    props.body.discussion_board_super_admin_id
  ) {
    throw new HttpException(
      "Cannot assign both regular and super administrator",
      400,
    );
  }
  if (
    !props.body.discussion_board_admin_id &&
    !props.body.discussion_board_super_admin_id
  ) {
    throw new HttpException(
      "Must specify either regular or super administrator",
      400,
    );
  }
  // Create the assignment using collector and transformer
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
