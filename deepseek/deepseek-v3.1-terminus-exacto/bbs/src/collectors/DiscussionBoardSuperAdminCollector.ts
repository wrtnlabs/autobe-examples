import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSuperAdminCollector {
  export async function collect(props: {
    body: IDiscussionBoardSuperAdmin.ICreate;
    discussionBoardSections: IEntity; // from path parameter sectionId
    discussionBoardAdmins: IEntity; // from authorized actor
  }) {
    const id = v4();
    return {
      id,
      permission_level: props.body.permission_level,
      assignment_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      admin: props.body.admin_id
        ? { connect: { id: props.body.admin_id } }
        : undefined,
      superAdmin: props.body.super_admin_id
        ? { connect: { id: props.body.super_admin_id } }
        : undefined,
      section: { connect: { id: props.discussionBoardSections.id } },
    } satisfies Prisma.discussion_board_section_administratorsCreateInput;
  }
}
