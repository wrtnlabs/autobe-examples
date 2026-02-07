import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSectionAdministratorCollector {
  export async function collect(props: {
    body: IDiscussionBoardSectionAdministrator.ICreate;
    section: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      permission_level: props.body.permission_level,
      assignment_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      admin: props.body.discussion_board_admin_id
        ? { connect: { id: props.body.discussion_board_admin_id } }
        : undefined,
      superAdmin: props.body.discussion_board_super_admin_id
        ? { connect: { id: props.body.discussion_board_super_admin_id } }
        : undefined,
      section: { connect: { id: props.section.id } },
    } satisfies Prisma.discussion_board_section_administratorsCreateInput;
  }
}
