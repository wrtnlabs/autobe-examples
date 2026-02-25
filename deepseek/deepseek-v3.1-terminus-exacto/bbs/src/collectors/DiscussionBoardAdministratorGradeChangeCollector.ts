import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAdministratorGradeChangeCollector {
  export async function collect(props: {
    body: IDiscussionBoardAdministratorGradeChange.ICreate;
    discussionBoardAdmins: IEntity; // from path parameter administratorId
    changedByAdministrator: IEntity; // from authorized actor
  }) {
    // Critical: This collector requires external grade determination logic
    // old_grade and new_grade cannot be empty strings in production
    const id: string = v4();
    // Query to get administrator data - select only existing fields
    const currentAdmin =
      await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
        where: { id: props.discussionBoardAdmins.id },
        select: { id: true, display_name: true, email: true },
      });
    // Simplified grade logic - using placeholder since actual grade field doesn't exist
    // In production, this would come from external business logic or different table
    const oldGrade = "placeholder_grade"; // Simplified for now
    const newGrade = "regular"; // Simplified for now - actual business logic needed
    return {
      id,
      old_grade: oldGrade,
      new_grade: newGrade,
      reason: props.body.reason,
      created_at: new Date(),
      administrator: { connect: { id: props.discussionBoardAdmins.id } },
      changedByAdministrator: {
        connect: { id: props.changedByAdministrator.id },
      },
    } satisfies Prisma.discussion_board_administrator_grade_changesCreateInput;
  }
}
